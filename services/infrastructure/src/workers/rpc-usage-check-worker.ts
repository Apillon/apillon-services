import {
  AppEnvironment,
  Context,
  DefaultUserRole,
  EmailDataDto,
  EmailTemplate,
  LogType,
  Mailing,
  MySql,
  Scs,
  ServiceName,
  SubscriptionPackageId,
  env,
  runWithWorkers,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { Dwellir } from '../lib/dwellir/dwellir';
import { DwellirUser } from '../modules/rpc/models/dwelir-user.model';
import Stripe from 'stripe';

const FREE_RPC_API_LIMIT = 400000;

const devConsoleConfig = {
  host: env.DEV_CONSOLE_API_MYSQL_HOST,
  database: env.DEV_CONSOLE_API_MYSQL_DATABASE,
  password: env.DEV_CONSOLE_API_MYSQL_PASSWORD,
  user: env.DEV_CONSOLE_API_MYSQL_USER,
  port: env.DEV_CONSOLE_API_MYSQL_PORT,
};

export class RpcUsageCheckWorker extends BaseQueueWorker {
  public constructor(
    workerDefinition: WorkerDefinition,
    context: Context,
    type: QueueWorkerType,
  ) {
    super(
      workerDefinition,
      context,
      type,
      env.INFRASTRUCTURE_AWS_WORKER_SQS_URL,
    );
  }

  public async runPlanner(): Promise<any[]> {
    return [];
  }

  public async runExecutor(input: { data: any }): Promise<any> {
    console.info('RUN EXECUTOR (RpcUsageCheckWorker');
    const usagesAll = await Dwellir.getAllUsagesPerUser();
    const dwellirIdsWithLargeUsage: string[] = [];
    for (const [userId, usage] of Object.entries(usagesAll)) {
      if (usage.total_requests > FREE_RPC_API_LIMIT) {
        dwellirIdsWithLargeUsage.push(userId);
      }
    }

    const dwellirUsers = await new DwellirUser(
      {},
      this.context,
    ).populateByDwellirIds(dwellirIdsWithLargeUsage);

    let newlyExceededUsers = dwellirUsers.filter((user) => {
      return !user.exceeded_monthly_limit;
    });

    await this.writeEventLog({
      logType: LogType.INFO,
      message: `Found ${newlyExceededUsers.length} users that have exceeded the monthly limit since the last check`,
      service: ServiceName.INFRASTRUCTURE,
    });

    if (newlyExceededUsers.length) {
      const scs = new Scs(this.context);
      const devConsoleSql = new MySql(devConsoleConfig);
      await devConsoleSql.connect();

      // Use Promise.all to handle asynchronous operations
      const filteredUsers = await Promise.all(
        newlyExceededUsers.map(async (user) => {
          const projects = await devConsoleSql.paramExecute(
            `
              SELECT pu.project_id
              FROM project_user pu
              LEFT JOIN user u ON pu.user_id = u.id
              WHERE u.uuid = @user_uuid 
              AND pu.role_id = ${DefaultUserRole.PROJECT_OWNER}
            `,
            { user_uuid: user.user_uuid },
          );
          const hasRpcPlan = await scs.hasProjectActiveRpcPlan(
            projects.map((p) => p.project_id),
          );
          // Return an object with the user and the result of the condition
          return { user, hasRpcPlan };
        }),
      );

      await this.writeEventLog({
        logType: LogType.INFO,
        message: `Found ${filteredUsers.length} users that have exceeded the monthly limit and do not have an active RPC plan`,
        service: ServiceName.INFRASTRUCTURE,
      });

      newlyExceededUsers = filteredUsers.reduce((acc, { user, hasRpcPlan }) => {
        if (!hasRpcPlan) {
          acc.push(user);
        }
        return acc;
      }, []);

      await devConsoleSql.close();
    }

    await Promise.all([
      newlyExceededUsers.length
        ? new DwellirUser({}, this.context).updateManyExceededMonthlyLimit(
            newlyExceededUsers.map((dwellirUser) => dwellirUser.id),
            true,
          )
        : undefined,
      // To update the users that might have exceeded the limit in the past
      new DwellirUser({}, this.context).updateManyExceededMonthlyLimit(
        dwellirUsers.map((dwellirUser) => dwellirUser.id),
        false,
        true,
      ),
    ]);

    await this.writeEventLog({
      logType: LogType.INFO,
      message: `Updated ${newlyExceededUsers.length} users that have exceeded the monthly limit`,
      service: ServiceName.INFRASTRUCTURE,
    });

    if (!newlyExceededUsers.length) {
      return;
    }

    const stripeClient = new Stripe(
      env.APP_ENV === AppEnvironment.PROD
        ? env.STRIPE_SECRET
        : env.STRIPE_SECRET_TEST,
    );
    const mailingMS = new Mailing(this.context);

    const scs = new Scs(this.context);

    const stripePackageId = await scs.getSubscriptionPackageStripeId(
      SubscriptionPackageId.RPC_PLAN,
    );

    await this.writeEventLog({
      logType: LogType.INFO,
      message: `Sending ${newlyExceededUsers.length} emails to users that have exceeded the monthly limit`,
      service: ServiceName.INFRASTRUCTURE,
    });

    await runWithWorkers(
      newlyExceededUsers,
      10,
      this.context,
      async (user: DwellirUser) => {
        const paymentSession = await stripeClient.checkout.sessions.create({
          line_items: [
            {
              price: stripePackageId,
              quantity: 1,
            },
          ],
          mode: 'subscription',
          customer_email: user.email,
          metadata: {
            user_uuid: user.user_uuid,
            package_id: SubscriptionPackageId.RPC_PLAN,
            isCreditPurchase: 'false',
            environment: env.APP_ENV,
          },
          billing_address_collection: 'required',
          success_url: `${env.APP_URL}/dashboard/service/rpc`,
          cancel_url: `${env.APP_URL}/dashboard/service/rpc`,
          automatic_tax: { enabled: true },
          allow_promotion_codes: true,
        });

        await this.writeEventLog({
          logType: LogType.INFO,
          message: `Sent email to ${user.email} to notify them of exceeding the monthly limit`,
          data: {
            mailAddresses: [user.email],
            templateName: EmailTemplate.RPC_USAGE_EXCEEDED,
            templateData: {
              paymentLink: paymentSession.url,
            },
          },
          service: ServiceName.INFRASTRUCTURE,
        });

        mailingMS.sendMail(
          new EmailDataDto({
            mailAddresses: [user.email],
            templateName: EmailTemplate.RPC_USAGE_EXCEEDED,
            templateData: {
              paymentLink: paymentSession.url,
            },
          }),
        );
      },
    );
  }
}
