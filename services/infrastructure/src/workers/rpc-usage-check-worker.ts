import {
  AppEnvironment,
  Context,
  EmailDataDto,
  EmailTemplate,
  Mailing,
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

    const newlyExceededUsers = dwellirUsers.filter(
      (user) => !user.exceeded_monthly_limit,
    );

    await Promise.all([
      new DwellirUser({}, this.context).updateManyExceededMonthlyLimit(
        newlyExceededUsers.map((dwellirUser) => dwellirUser.id),
        true,
      ),
      // To update the users that might have exceeded the limit in the past
      new DwellirUser({}, this.context).updateManyExceededMonthlyLimit(
        dwellirUsers.map((dwellirUser) => dwellirUser.id),
        false,
        true,
      ),
    ]);

    const stripeClient = new Stripe(
      env.APP_ENV === AppEnvironment.PROD
        ? env.STRIPE_SECRET
        : env.STRIPE_SECRET_TEST,
    );
    const mailingMS = new Mailing(this.context);

    await runWithWorkers(
      newlyExceededUsers,
      10,
      this.context,
      async (user: DwellirUser) => {
        const paymentSession = await stripeClient.checkout.sessions.create({
          line_items: [
            {
              price: 'PRICE',
              quantity: 1,
            },
          ],
          mode: 'subscription',
          customer_email: user.email,
          metadata: {
            project_uuid: user.user_uuid,
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
