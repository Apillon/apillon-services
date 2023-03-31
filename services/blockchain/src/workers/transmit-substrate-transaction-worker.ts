import { Context, env, Lmas, LogType, ServiceName } from '@apillon/lib';
import {
  WorkerDefinition,
  WorkerLogStatus,
  BaseSingleThreadWorker,
  sendToWorkerQueue,
} from '@apillon/workers-lib';
import { BlockchainErrorCode } from '../config/types';
import { BlockchainCodeException } from '../lib/exceptions';
import { SubstrateService } from '../modules/substrate/substrate.service';
import { WorkerName } from './worker-executor';

export class TransmitSubstrateTransactionWorker extends BaseSingleThreadWorker {
  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);
  }

  public async runPlanner(): Promise<any[]> {
    return [];
  }
  public async runExecutor(data: any): Promise<any> {
    console.info(
      'RUN EXECUTOR (TransmitSubstrateTransactionWorker). data: ',
      data,
    );
    const chain = data?.chain;
    if (!chain) {
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.INVALID_DATA_PASSED_TO_WORKER,
        status: 500,
        details: data,
      });
    }

    try {
      await SubstrateService.transmitTransactions({ chain }, this.context);

      await new Lmas().writeLog({
        context: this.context,
        logType: LogType.COST,
        message: 'Substrate transactions submitted',
        location: `${this.constructor.name}/runExecutor`,
        service: ServiceName.BLOCKCHAIN,
        data: data,
      });
    } catch (err) {
      await new Lmas().writeLog({
        context: this.context,
        logType: LogType.ERROR,
        message: 'Error submitting transactions',
        location: `${this.constructor.name}/runExecutor`,
        service: ServiceName.BLOCKCHAIN,
        data: {
          data,
          err,
        },
      });
      throw err;
    }

    try {
      await sendToWorkerQueue(
        env.BLOCKCHAIN_AWS_WORKER_SQS_URL,
        WorkerName.CRUST_TRANSACTIONS,
        [{}],
        null,
        null,
      );
    } catch (e) {
      await new Lmas().writeLog({
        logType: LogType.ERROR,
        message: 'Error triggering CRUST_TRANSACTIONS worker queue',
        location: 'TransmitSubstrateTransactionWorker.runExecutor',
        service: ServiceName.BLOCKCHAIN,
        data: {
          error: e,
        },
      });
    }

    await this.writeLogToDb(
      WorkerLogStatus.INFO,
      `TransmitSubstrateTransactionWorker worker has been completed!`,
    );

    return true;
  }
}
