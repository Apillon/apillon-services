import {
  Context,
  env,
  Lmas,
  LogType,
  ResourceDeployWebhookDataDto,
  ResourceStatus,
  SerializeFor,
  ServiceName,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  LogOutput,
  QueueWorkerType,
  WorkerDefinition,
  WorkerService,
} from '@apillon/workers-lib';
import { DbTables } from '../config/types';
import { PhalaCloudClient } from '../modules/deploy/clients/phala-cloud.client';
import { getBackendStatus } from '../modules/deploy/helpers/phala-statuses';
import { WorkerName } from './worker-executor';
import { DeployRepository } from '../modules/deploy/repositores/deploy-repository';

export class BackendStatusWebhookWorker extends BaseQueueWorker {
  private backendRepository: DeployRepository;
  private phalaClient: PhalaCloudClient;
  private workerService: WorkerService;

  public constructor(
    workerDefinition: WorkerDefinition,
    context: Context,
    type: QueueWorkerType,
    backendRepository: DeployRepository,
    phalaClient: PhalaCloudClient,
    WorkerService: WorkerService,
    logger: Lmas,
  ) {
    super(
      workerDefinition,
      context,
      type,
      env.DEPLOY_AWS_WORKER_SQS_URL,
      logger,
    );
    this.backendRepository = backendRepository;
    this.phalaClient = phalaClient;
    this.workerService = WorkerService;
  }

  public async runPlanner(): Promise<any[]> {
    return [];
  }

  public async runExecutor(params: any): Promise<any> {
    const conn = await this.context.mysql.start();
    try {
      const backendDeploys =
        await this.backendRepository.getBackendForStatusUpdate(
          env.DEPLOY_STATUS_UPDATE_INTERVAL_HOURS,
          conn,
        );

      // get status for each backend and update DB and emit an event
      const backendWebhookItems = [];
      for (const backendDeploy of backendDeploys) {
        try {
          const cvmDetails = await this.phalaClient.getCVMDetails(
            backendDeploy.instanceId,
          );
          const backendStatus = getBackendStatus(cvmDetails.status);
          if (backendStatus === ResourceStatus.REQUESTED) {
            await this.writeEventLog(
              {
                logType: LogType.INFO,
                message: `Skipping backend update for uuid: ${backendDeploy.backend_uuid} as status is still CREATED.`,
                service: ServiceName.DEPLOY,
                data: {
                  backend_uuid: backendDeploy.backend_uuid,
                  instanceId: backendDeploy.instanceId,
                  backendStatus,
                },
              },
              LogOutput.EVENT_INFO,
            );
            continue;
          }
          backendDeploy.backendStatus = backendStatus;
          await backendDeploy.update(SerializeFor.UPDATE_DB, conn);
          // TODO: change to batch update for status and webhook?
          backendWebhookItems.push(
            new ResourceDeployWebhookDataDto().populate({
              referenceTable: DbTables.BACKEND,
              referenceId: backendDeploy.backend_uuid,
              resourceStatus: backendDeploy.backendStatus,
            }),
          );
        } catch (error) {
          await this.writeEventLog(
            {
              logType: LogType.ERROR,
              message: `Error updating backend deploy for uuid: ${backendDeploy.backend_uuid}`,
              service: ServiceName.DEPLOY,
              data: { backend_uuid: backendDeploy.backend_uuid, error },
              err: error,
            },
            LogOutput.NOTIFY_ALERT,
          );
        }
      }

      const updatedTransactionIds = await this.processWebhook(
        backendWebhookItems,
        env.SIMPLETS_AWS_WORKER_SQS_URL,
        WorkerName.BACKEND_STATUS_WORKER,
      );

      if (updatedTransactionIds.length > 0) {
        await this.context.mysql.paramExecute(
          `
            UPDATE \`${DbTables.BACKEND}\`
            SET webhookTriggered = NOW()
            WHERE backend_uuid in (${updatedTransactionIds.map((id) => `'${id}'`).join(',')})`,
          null,
          conn,
        );

        await this.writeEventLog(
          {
            logType: LogType.INFO,
            message: `Triggered webhooks for ${updatedTransactionIds.length} backend deploys!`,
            service: ServiceName.DEPLOY,
            data: { updates: updatedTransactionIds },
          },
          LogOutput.EVENT_INFO,
        );
      }
      await conn.commit();
    } catch (err) {
      // console.log(err);
      await conn.rollback();
      await this.writeEventLog(
        {
          logType: LogType.ERROR,
          message: 'Error in TransactionWebhookWorker',
          service: ServiceName.DEPLOY,
          data: { params, err },
          err,
        },
        LogOutput.SYS_ERROR,
      );
      throw err;
    }

    return true;
  }

  splitter(arr, splitBy) {
    const cache = [];
    const tmp = [...arr];
    while (tmp.length) {
      cache.push(tmp.splice(0, splitBy));
    }
    return cache;
  }

  async processWebhook(webhooks: any[], sqsUrl: string, workerName: string) {
    let updates = [];
    if (webhooks.length > 0) {
      const splits = this.splitter(webhooks, 10); // batch updates to up to 10 items
      for (let i = 0; i < splits.length; i++) {
        try {
          // sending batch by batch because we need to know if a failure occurred.
          const res = await this.workerService.sendToWorkerQueue(
            sqsUrl,
            workerName,
            [
              {
                data: splits[i],
              },
            ],
            null,
            null,
          );
          if (res.errCount > 0) {
            throw new Error(res.errMsgs[0]);
          }

          console.log('pushed webhook');
          updates = [...updates, splits[i].map((a) => a.referenceId)];
        } catch (e) {
          await this.writeEventLog(
            {
              logType: LogType.ERROR,
              message: 'Error in TransactionWebhookWorker sending webhook',
              service: ServiceName.DEPLOY,
              data: { splits, e },
              err: e,
            },
            LogOutput.SYS_ERROR,
          );
        }
      }
    }
    return updates;
  }
}
