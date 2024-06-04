import { LogType, ServiceName, env } from '@apillon/lib';
import {
  BaseQueueWorker,
  LogOutput,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { DbTables } from '../config/types';

/**
 * Worker processes wallets which have successfully claimed tokens and marks them as complete
 */
export class ClaimContractEventWorker extends BaseQueueWorker {
  public constructor(
    workerDefinition: WorkerDefinition,
    context,
    type: QueueWorkerType,
  ) {
    super(workerDefinition, context, type, env.REFERRAL_AWS_WORKER_SQS_URL);
    this.context = context;
  }

  public async runPlanner(): Promise<any[]> {
    return [];
  }

  public async runExecutor(input: { data: string[] }): Promise<any> {
    await this.writeEventLog(
      {
        logType: LogType.INFO,
        message: `RUN EXECUTOR (ClaimContractEventWorker). data: ${input.data}`,
        service: ServiceName.REFERRAL,
      },
      LogOutput.DEBUG,
    );

    if (!input.data.length) {
      return;
    }

    const wallets = input.data.map((d) => d.toLowerCase()).join("','");
    // Update status of token claims, for received wallet addresses
    await this.context.mysql.paramExecute(
      `
        UPDATE \`${DbTables.TOKEN_CLAIM}\`
        SET claimCompleted = TRUE
        WHERE LOWER(wallet) IN ('${wallets}')
      `,
      {},
    );
  }
}
