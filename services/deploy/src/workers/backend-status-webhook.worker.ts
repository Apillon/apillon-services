import {
  Context,
  env,
  Lmas,
  LogType,
  ResourceDeployWebhookDataDto,
  SerializeFor,
  ServiceName,
  splitArray,
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
      await this.writeEventLog(
        {
          logType: LogType.INFO,
          message: `Retrieved ${backendDeploys.length} backends for status update`,
          service: ServiceName.DEPLOY,
          data: { count: backendDeploys.length },
        },
        LogOutput.EVENT_INFO,
      );

      // get status for each backend and update DB and emit an event
      const backendWebhookItems = [];
      for (const backendDeploy of backendDeploys) {
        try {
          const cvmDetails = await this.phalaClient.getCVMDetails(
            backendDeploy.instanceId,
          );
          await this.writeEventLog(
            {
              logType: LogType.INFO,
              message: `Retrieved CVM details for backend deploy ${backendDeploy.backend_uuid} with status ${cvmDetails.status}`,
              service: ServiceName.DEPLOY,
              data: { cvmDetails },
            },
            LogOutput.EVENT_INFO,
          );

          const backendStatus = getBackendStatus(cvmDetails.status);
          const statusChanged = backendStatus !== backendDeploy.backendStatus;
          backendDeploy.backendStatus = backendStatus;
          await backendDeploy.update(SerializeFor.UPDATE_DB, conn);
          if (!statusChanged) {
            await this.writeEventLog(
              {
                logType: LogType.INFO,
                message: `Backend deploy ${backendDeploy.backend_uuid} status hasn't changed: ${backendStatus}`,
                service: ServiceName.DEPLOY,
                data: {
                  backendStatus,
                  backend_uuid: backendDeploy.backend_uuid,
                },
              },
              LogOutput.EVENT_INFO,
            );
            continue;
          }
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

  async processWebhook(webhooks: any[], sqsUrl: string, workerName: string) {
    let updates = [];
    if (webhooks.length > 0) {
      const splits = splitArray(webhooks, 10); // batch updates to up to 10 items
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
