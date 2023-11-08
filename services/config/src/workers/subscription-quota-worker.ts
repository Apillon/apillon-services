import {
  AppEnvironment,
  CodeException,
  Context,
  DefaultUserRole,
  LogType,
  Mailing,
  MySql,
  ServiceName,
  SqlModelStatus,
  StorageMicroservice,
  env,
  getConsoleApiMysql,
} from '@apillon/lib';
import { BaseWorker, Job, WorkerDefinition } from '@apillon/workers-lib';
import { Subscription } from '../modules/subscription/models/subscription.model';
import _ from 'lodash';
import { ConfigErrorCode } from '../config/types';

export class SubscriptionQuotaWorker extends BaseWorker {
  protected context: Context;
  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);
  }

  public async before(_data?: any): Promise<any> {
    // Not used
  }

  public async execute(data?: any): Promise<any> {
    const consoleDb = getConsoleApiMysql();
    await consoleDb.connect();

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

      const projectOwner = await this.getProjectOwner(
        consoleDb,
        project.project_uuid,
      );

      if (!projectOwner?.email) {
        return await this.writeEventLog({
          logType: LogType.WARN,
          message: `Project owner for ${project.project_uuid} not found or does not have a valid email`,
          service: ServiceName.CONFIG,
          project_uuid: project.project_uuid,
          data: { projectOwner },
        });
      }

      if (+expiresOn === +this.daysAgo(3)) {
        await new Mailing(this.context).sendMail({
          emails: [projectOwner.email],
          template: 'storage-quota-exceeded',
          data: projectOwner,
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
      const subs = await new Subscription(
        {},
        this.context,
      ).getExpiredSubscriptions(35);

      const projectsStorage = await Promise.all(
        _.uniqBy(subs, 'project_uuid').map(
          async ({ project_uuid, expiresOn }) => {
            const { data } = await new StorageMicroservice(
              this.context,
            ).getStorageInfo(project_uuid);
            return {
              ...data,
              project_uuid,
              expiresOn,
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

  private async getProjectOwner(consoleDb: MySql, project_uuid: string) {
    try {
      const { 0: projectOwner } = await consoleDb.paramExecute(
        `
        SELECT p.project_uuid, pu.user_id, u.user_uuid, u.name, u.email
        FROM \`project\` p
        JOIN \`project_user\` pu ON p.id = pu.project_id
        JOIN \`user\` u ON pu.user_id = u.id
        WHERE p.project_uuid = @project_uuid
        AND role_id = @role_id
        AND p.status <> ${SqlModelStatus.DELETED}
        LIMIT 1;
        `,
        {
          project_uuid,
          role_id: DefaultUserRole.PROJECT_OWNER,
        },
      );

      return projectOwner;
    } catch (err) {
      await new CodeException({
        code: ConfigErrorCode.SUBSCRIPTION_QUOTA_WORKER_UNHANDLED_EXCEPTION,
        status: 500,
        context: this.context,
        errorCodes: ConfigErrorCode,
        errorMessage: `Subscription quota worker error while getting project owner: ${err?.message}`,
        details: err,
        sourceFunction: 'SubscriptionQuotaWorker.getProjectOwner',
        sourceModule: ServiceName.CONFIG,
      }).writeToMonitor({ sendAdminAlert: true });
    }
  }
}
