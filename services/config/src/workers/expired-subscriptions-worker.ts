import {
  AppEnvironment,
  CodeException,
  Context,
  DefaultUserRole,
  EmailDataDto,
  EmailTemplate,
  InfrastructureMicroservice,
  LogType,
  Mailing,
  MySql,
  ServiceName,
  StorageMicroservice,
  env,
} from '@apillon/lib';
import {
  BaseWorker,
  Job,
  WorkerDefinition,
  sendToWorkerQueue,
} from '@apillon/workers-lib';
import { Subscription } from '../modules/subscription/models/subscription.model';
import { uniqBy } from 'lodash';
import { ConfigErrorCode, QuotaWarningLevel } from '../config/types';

const devConsoleConfig = {
  host: env.DEV_CONSOLE_API_MYSQL_HOST,
  database: env.DEV_CONSOLE_API_MYSQL_DATABASE,
  password: env.DEV_CONSOLE_API_MYSQL_PASSWORD,
  user: env.DEV_CONSOLE_API_MYSQL_USER,
  port: env.DEV_CONSOLE_API_MYSQL_PORT,
};

/**
 * Checks all expired subscriptions and identifies projects with expired subscriptions which are exceeding quotas
 * Sends warnings to all project owners to release resources (currently storage) on the 3rd, 15th and 30th day after subscription ends
 * If no action has been taken, automatically frees up all exceeded resources by calling FreeProjectResourcesWorker
 * @typedef {ExpiredSubscriptionsWorker}
 * @extends {BaseWorker}
 */
export class ExpiredSubscriptionsWorker extends BaseWorker {
  protected context: Context;

  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);
  }

  public async before(_data?: any): Promise<any> {
    // Not used
  }

  public async execute(_data?: any): Promise<any> {
    const projectsExceedingStorage = await this.getProjectsExceedingStorage();
    if (!projectsExceedingStorage?.length) {
      return;
    }

    await this.writeEventLog({
      logType: LogType.INFO,
      message: `Found ${projectsExceedingStorage.length} expired subscriptions for projects which exceed quota`,
      service: ServiceName.CONFIG,
    });

    for (const project of projectsExceedingStorage) {
      const expiresOn = new Date(project.expiresOn);

      if (!project?.subscriberEmail) {
        return await this.writeEventLog({
          logType: LogType.WARN,
          message: `Subscriber email for project ${project.project_uuid} not found or does not have a valid email`,
          service: ServiceName.CONFIG,
          project_uuid: project.project_uuid,
          data: { project },
        });
      }

      if (
        +expiresOn <= +this.daysAgo(3) &&
        (!project.quotaWarningLevel ||
          project.quotaWarningLevel < QuotaWarningLevel.THREE_DAYS)
      ) {
        await new Mailing(this.context).sendMail(
          new EmailDataDto({
            mailAddresses: [project.subscriberEmail],
            templateName: EmailTemplate.STORAGE_QUOTA_EXCEEDED,
            templateData: project,
          }),
        );
        await new Subscription(project, this.context).updateQuotaWarningLevel(
          QuotaWarningLevel.THREE_DAYS,
        );
      } else if (
        +expiresOn <= +this.daysAgo(15) &&
        project.quotaWarningLevel < QuotaWarningLevel.FIFTEEN_DAYS
      ) {
        await new Mailing(this.context).sendMail(
          new EmailDataDto({
            mailAddresses: [project.subscriberEmail],
            templateName: EmailTemplate.STORAGE_QUOTA_EXCEEDED,
            templateData: project,
          }),
        );
        await new Subscription(project, this.context).updateQuotaWarningLevel(
          QuotaWarningLevel.FIFTEEN_DAYS,
        );
      } else if (
        +expiresOn <= +this.daysAgo(30) &&
        project.quotaWarningLevel < QuotaWarningLevel.THIRTY_DAYS
      ) {
        await new Mailing(this.context).sendMail(
          new EmailDataDto({
            mailAddresses: [project.subscriberEmail],
            templateName: EmailTemplate.STORAGE_QUOTA_EXCEEDED,
            templateData: project,
          }),
        );
        await new Subscription(project, this.context).updateQuotaWarningLevel(
          QuotaWarningLevel.THIRTY_DAYS,
        );
      } else if (project.quotaWarningLevel === QuotaWarningLevel.THIRTY_DAYS) {
        //Send message to storage queue
        await sendToWorkerQueue(
          env.STORAGE_AWS_WORKER_SQS_URL,
          'FreeProjectResourcesWorker',
          [
            {
              project_uuid: project.project_uuid,
              maxStorageQuota: project.availableStorage,
            },
          ],
          null,
          null,
        );

        await new Subscription(project, this.context).updateQuotaWarningLevel(
          QuotaWarningLevel.RESOURCES_RELEASED,
        );
      }
    }

    // RPC Plan expiration check
    const expiredRpcPlans = await this.getExpiredRpcPlans();
    if (!expiredRpcPlans.expiredSubscriptions.length) {
      return;
    }

    const infrastructureMS = new InfrastructureMicroservice(this.context);

    await infrastructureMS.downgradeDwellirSubscriptionsByUserUuids(
      expiredRpcPlans.userUuidsToDowngrade,
    );

    await new Subscription({}, this.context).deactivateSubscriptions(
      expiredRpcPlans.expiredSubscriptions,
    );
  }

  public async onSuccess(_data?: any, _successData?: any): Promise<any> {
    // this.logFn(`ClearLogs - success: ${data} | ${successData} `);
  }

  public async onError(error: Error): Promise<any> {
    this.logFn(`ExpiredSubscriptionsWorker - error: ${error}`);
  }

  public async onUpdateWorkerDefinition(): Promise<void> {
    // this.logFn(`ExpiredSubscriptionsWorker - update definition: ${this.workerDefinition}`);
    if (
      env.APP_ENV != AppEnvironment.LOCAL_DEV &&
      env.APP_ENV != AppEnvironment.TEST
    ) {
      await new Job({}, this.context).updateWorkerDefinition(
        this.workerDefinition,
      );
    }
    // this.logFn('ExpiredSubscriptionsWorker - update definition COMPLETE');
  }

  public onAutoRemove(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  public async getProjectsExceedingStorage() {
    try {
      const expiredSubscriptions = await new Subscription(
        {},
        this.context,
      ).getExpiredSubscriptions(35, false);

      const projectsStorage = await Promise.all(
        uniqBy(expiredSubscriptions, 'project_uuid').map(
          async (subscription) => {
            const { data } = await new StorageMicroservice(
              this.context,
            ).getStorageInfo(subscription.project_uuid);

            return {
              ...data,
              ...subscription,
            };
          },
        ),
      );

      return projectsStorage.filter((p) => p.usedStorage > p.availableStorage);
    } catch (err) {
      await new CodeException({
        code: ConfigErrorCode.SUBSCRIPTION_QUOTA_WORKER_UNHANDLED_EXCEPTION,
        status: 500,
        context: this.context,
        errorCodes: ConfigErrorCode,
        errorMessage: `Subscription quota worker error while getting projects and storage: ${err?.message}`,
        details: err,
        sourceFunction:
          'ExpiredSubscriptionsWorker.getProjectsExceedingStorage',
        sourceModule: ServiceName.CONFIG,
      }).writeToMonitor({ sendAdminAlert: true });
    }
  }

  public async getExpiredRpcPlans() {
    const expiredSubscriptions = await new Subscription(
      {},
      this.context,
    ).getExpiredSubscriptions(0, true);
    const projectUuids = expiredSubscriptions.map(
      (subscriptions) => subscriptions.project_uuid,
    );

    const devConsoleSql = new MySql(devConsoleConfig);
    await devConsoleSql.connect();

    const projectOwners = await devConsoleSql.paramExecute(`
      SELECT DISTINCT u.user_uuid FROM project_user pu LEFT JOIN user u ON pu.user_id = u.id LEFT JOIN project p ON p.id = pu.project_id WHERE pu.role_id = ${DefaultUserRole.PROJECT_OWNER} AND p.project_uuid IN (${projectUuids.map(() => `'${projectUuids}'`).join(',')})`);
    await devConsoleSql.close();

    return {
      expiredSubscriptions: expiredSubscriptions.map(
        (subscription) => subscription.id,
      ),
      userUuidsToDowngrade: projectOwners.map((user) => user.user_uuid),
    };
  }

  private daysAgo = (days: number) => {
    const today = new Date();

    const daysAgo = new Date(today);
    daysAgo.setDate(today.getDate() - days);

    return daysAgo;
  };
}
