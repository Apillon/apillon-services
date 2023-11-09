import {
  AppEnvironment,
  CodeException,
  Context,
  LogType,
  Mailing,
  ServiceName,
  StorageMicroservice,
  env,
} from '@apillon/lib';
import { BaseWorker, Job, WorkerDefinition } from '@apillon/workers-lib';
import { Subscription } from '../modules/subscription/models/subscription.model';
import { uniqBy } from 'lodash';
import { ConfigErrorCode } from '../config/types';

export class SubscriptionQuotaWorker extends BaseWorker {
  protected context: Context;

  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);
  }

  public async before(_data?: any): Promise<any> {
    // Not used
  }

  public async execute(_data?: any): Promise<any> {
    const projectsExceedingStorage = await this.getProjectsExceedingStorage();
    if (!projectsExceedingStorage.length) {
      return;
    }

    await this.writeEventLog({
      logType: LogType.INFO,
      message: `Found ${projectsExceedingStorage.length} expired subscriptions for projects which exceed quota`,
      service: ServiceName.CONFIG,
    });

    for (const project of projectsExceedingStorage) {
      const expiresOn = new Date(project.expiresOn);
      expiresOn.setHours(0, 0, 0, 0);

      if (!project?.subscriberEmail) {
        return await this.writeEventLog({
          logType: LogType.WARN,
          message: `Subscriber email for project${project.project_uuid} not found or does not have a valid email`,
          service: ServiceName.CONFIG,
          project_uuid: project.project_uuid,
          data: { project },
        });
      }

      if (+expiresOn === +this.daysAgo(3)) {
        await new Mailing(this.context).sendMail({
          emails: [project.subscriberEmail],
          template: 'storage-quota-exceeded',
          data: project,
        });
      } //else if (+expiresOn === +this.daysAgo(15)) {
      // } else if (+expiresOn === +this.daysAgo(30)) {
      // }
    }
  }

  public async onSuccess(_data?: any, _successData?: any): Promise<any> {
    // this.logFn(`ClearLogs - success: ${data} | ${successData} `);
  }

  public async onError(error: Error): Promise<any> {
    this.logFn(`SubscriptionQuotaWorker - error: ${error}`);
  }

  public async onUpdateWorkerDefinition(): Promise<void> {
    // this.logFn(`SubscriptionQuotaWorker - update definition: ${this.workerDefinition}`);
    if (
      env.APP_ENV != AppEnvironment.LOCAL_DEV &&
      env.APP_ENV != AppEnvironment.TEST
    ) {
      await new Job({}, this.context).updateWorkerDefinition(
        this.workerDefinition,
      );
    }
    // this.logFn('SubscriptionQuotaWorker - update definition COMPLETE');
  }

  public onAutoRemove(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  private daysAgo = (days: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysAgo = new Date(today);
    daysAgo.setDate(today.getDate() - days);

    return daysAgo;
  };

  private async getProjectsExceedingStorage() {
    try {
      const expiredSubscriptions = await new Subscription(
        {},
        this.context,
      ).getExpiredSubscriptions(35);

      const projectsStorage = await Promise.all(
        uniqBy(expiredSubscriptions, 'project_uuid').map(
          async ({ project_uuid, expiresOn, subscriberEmail }) => {
            const { data } = await new StorageMicroservice(
              this.context,
            ).getStorageInfo(project_uuid);

            return {
              ...data,
              project_uuid,
              expiresOn,
              subscriberEmail,
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
        sourceFunction: 'SubscriptionQuotaWorker.getProjectsExceedingStorage',
        sourceModule: ServiceName.CONFIG,
      }).writeToMonitor({ sendAdminAlert: true });
    }
  }
}
