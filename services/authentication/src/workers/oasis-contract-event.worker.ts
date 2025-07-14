import {
  Ams,
  CreateOrUpdateNotificationDto,
  LogType,
  Mailing,
  NotificationType,
  ServiceName,
  SqlModelStatus,
  env,
  runWithWorkers,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  LogOutput,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { DbTables } from '../config/types';
import { OasisSignature } from '../modules/embedded-wallet/models/oasis-signature.model';

/**
 * Worker process datahashes which are indexed (contract event) in BCS and sent to SQS
 */
export class OasisContractEventWorker extends BaseQueueWorker {
  public constructor(
    workerDefinition: WorkerDefinition,
    context,
    type: QueueWorkerType,
  ) {
    super(workerDefinition, context, type, env.AUTH_AWS_WORKER_SQS_URL);
    this.context = context;
  }

  public async runPlanner(): Promise<any[]> {
    return [];
  }

  public async runExecutor(input: {
    data: {
      dataHash: string;
      contractAddress: string;
      publicAddress: string;
    }[];
  }): Promise<any> {
    await this.writeEventLog(
      {
        logType: LogType.INFO,
        message: `RUN EXECUTOR (OasisContractEventWorker). data: ${input}`,
        service: ServiceName.AUTHENTICATION_API,
      },
      LogOutput.DEBUG,
    );

    // Update status of oasis-signatures, for received dataHashes and update other oasis signature properties
    for (const data of input.data) {
      await this.context.mysql.paramExecute(
        `
        UPDATE \`${DbTables.OASIS_SIGNATURE}\`
        SET
          status = ${SqlModelStatus.ACTIVE},
          contractAddress = '${data.contractAddress}',
          publicAddress = '${data.publicAddress}'
        WHERE dataHash LIKE '${data.dataHash}'
      `,
        {},
      );

      const signature = await new OasisSignature(
        {},
        this.context,
      ).populateByDataHash(data.dataHash);

      if (!signature.exists()) {
        await this.writeEventLog(
          {
            logType: LogType.WARN,
            message: `Oasis signature with dataHash ${data.dataHash} not found.`,
            service: ServiceName.AUTHENTICATION_API,
          },
          LogOutput.SYS_ERROR,
        );
        continue;
      } else {
        const projectOwner = (
          await new Ams(this.context).getProjectOwner(signature.project_uuid)
        ).data;

        await new Mailing(this.context).createNotification(
          new CreateOrUpdateNotificationDto({}, this.context).populate({
            type: NotificationType.EMBEDDED_WALLET_GENERATED,
            user_uuid: projectOwner?.user_uuid,
          }),
        );
      }
    }
  }
}
