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

  public async runExecutor(input: {
    data: {
      wallet: string;
      transactionHash: string;
    }[];
  }): Promise<any> {
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

    try {
      await Promise.all(
        input.data.map(({ wallet, transactionHash }) => {
          // Update status of token claims, for received wallet addresses
          this.context.mysql.paramExecute(
            `
            UPDATE \`${DbTables.TOKEN_CLAIM}\`
            SET claimCompleted = TRUE, transactionHash = @transactionHash
            WHERE LOWER(wallet) = LOWER(@wallet)
          `,
            { wallet, transactionHash },
          );
        }),
      );
      await this.writeEventLog(
        {
          logType: LogType.INFO,
          message: `Successfully updated ${input.data.length} token claims`,
          service: ServiceName.REFERRAL,
        },
        LogOutput.DEBUG,
      );
    } catch (err) {
      await this.writeEventLog(
        {
          logType: LogType.ERROR,
          message: `Error updating token claims: ${err}`,
          service: ServiceName.REFERRAL,
          data: input.data,
          err,
        },
        LogOutput.EVENT_ERROR,
      );
    }
  }
}
