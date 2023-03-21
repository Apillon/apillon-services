import { Context, Lmas, LogType, ServiceName } from '@apillon/lib';
import {
  WorkerDefinition,
  WorkerLogStatus,
  BaseSingleThreadWorker,
} from '@apillon/workers-lib';
import { BlockchainErrorCode } from '../config/types';
import { BlockchainCodeException } from '../lib/exceptions';
import { SubstrateService } from '../modules/substrate/substrate.service';

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
      // TODO: Call transaction parser worker

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

    await this.writeLogToDb(
      WorkerLogStatus.INFO,
      `TransmitSubstrateTransactionWorker worker has been completed!`,
    );

    return true;
  }
}
