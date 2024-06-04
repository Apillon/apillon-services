import { LogType, ServiceName, SqlModelStatus, env } from '@apillon/lib';
import {
  BaseQueueWorker,
  LogOutput,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { DbTables } from '../config/types';

/**
 * Worker process datahashes which are indexed (contract event) in BCS and sent to SQS
 */
export class ClaimContractEventWorker extends BaseQueueWorker {
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

  public async runExecutor(input: any): Promise<any> {
    await this.writeEventLog(
      {
        logType: LogType.INFO,
        message: `RUN EXECUTOR (ClaimContractEventWorker). data: ${input}`,
        service: ServiceName.REFERRAL,
      },
      LogOutput.DEBUG,
    );

    // Update status of token claims, for received dataHashes
    await this.context.mysql.paramExecute(
      `
      UPDATE \`${DbTables.TOKEN_CLAIM}\`
      SET status = ${SqlModelStatus.ACTIVE}
      WHERE dataHash IN ('${input.data.join("','")}')
    `,
      {},
    );
  }
}
