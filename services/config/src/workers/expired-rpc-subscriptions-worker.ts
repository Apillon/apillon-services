import {
  AppEnvironment,
  Context,
  DefaultUserRole,
  InfrastructureMicroservice,
  LogType,
  MySql,
  QuotaCode,
  ServiceName,
  SubscriptionPackageId,
  env,
} from '@apillon/lib';
import { BaseWorker, Job, WorkerDefinition } from '@apillon/workers-lib';
import { Subscription } from '../modules/subscription/models/subscription.model';
import { OverrideService } from '../modules/override/override.service';

const devConsoleConfig = {
  host: env.DEV_CONSOLE_API_MYSQL_HOST,
  database: env.DEV_CONSOLE_API_MYSQL_DATABASE,
  password: env.DEV_CONSOLE_API_MYSQL_PASSWORD,
  user: env.DEV_CONSOLE_API_MYSQL_USER,
  port: env.DEV_CONSOLE_API_MYSQL_PORT,
};

/**
 * Identifies projects with expired RPC subscriptions, sends downgrade request to dwellir API & deactivates expired subscriptions
 * @typedef {ExpiredRpcSubscriptionsWorker}
 * @extends {BaseWorker}
 */
export class ExpiredRpcSubscriptionsWorker extends BaseWorker {
  protected context: Context = null;

  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);
  }

  public async before(_data?: any): Promise<any> {
    // Not used
  }

  public async execute(_data?: any): Promise<any> {
    const expiredRpcPlans = await this.getExpiredRpcPlans();
    if (!expiredRpcPlans.expiredSubscriptions.length) {
      return;
    }

    await this.writeEventLog({
      logType: LogType.INFO,
      message: `Found ${expiredRpcPlans.expiredSubscriptions.length} expired RPC plans`,
      service: ServiceName.CONFIG,
    });

    const infrastructureMS = new InfrastructureMicroservice(this.context);

    await this.writeEventLog({
      logType: LogType.INFO,
      message: `Downgrading subscriptions for ${expiredRpcPlans.userUuidsToDowngrade.length} users`,
      service: ServiceName.CONFIG,
    });

    await infrastructureMS.downgradeDwellirSubscriptionsByUserUuids(
      expiredRpcPlans.userUuidsToDowngrade,
    );

    await this.writeEventLog({
      logType: LogType.INFO,
      message: `Deactivating ${expiredRpcPlans.expiredSubscriptions.length} expired subscriptions`,
      service: ServiceName.CONFIG,
    });

    await new Subscription({}, this.context).deactivateSubscriptions(
      expiredRpcPlans.expiredSubscriptions,
    );

    await OverrideService.deleteOverrides(
      expiredRpcPlans.userUuidsToDowngrade,
      QuotaCode.MAX_RPC_KEYS,
      this.context,
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

  public async getExpiredRpcPlans() {
    const expiredSubscriptions = await new Subscription(
      {},
      this.context,
    ).getExpiredSubscriptions(
      0,
      true,
      undefined,
      SubscriptionPackageId.RPC_PLAN,
    );
    const projectUuids = expiredSubscriptions.map(
      (subscriptions) => subscriptions.project_uuid,
    );

    const devConsoleSql = new MySql(devConsoleConfig);
    await devConsoleSql.connect();

    const projectOwners = await devConsoleSql.paramExecute(`
        SELECT DISTINCT u.user_uuid 
        FROM project_user pu 
        LEFT JOIN user u 
        ON pu.user_id = u.id 
        LEFT JOIN project p 
        ON p.id = pu.project_id 
        WHERE pu.role_id = ${DefaultUserRole.PROJECT_OWNER} 
        AND p.project_uuid IN (${projectUuids.map(() => `'${projectUuids}'`).join(',')})
      `);
    await devConsoleSql.close();

    return {
      expiredSubscriptions: expiredSubscriptions.map(
        (subscription) => subscription.id,
      ),
      userUuidsToDowngrade: projectOwners.map((user) => user.user_uuid),
    };
  }
}
