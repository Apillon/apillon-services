import { Context, env, Lmas, LogType, ServiceName } from '@apillon/lib';
import {
  WorkerDefinition,
  WorkerLogStatus,
  BaseSingleThreadWorker,
  sendToWorkerQueue,
  LogOutput,
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
    return [{}];
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
      await SubstrateService.transmitTransactions(
        { chain },
        this.context,
        this.writeEventLog,
      );
      // await this.writeEventLog(
      //   {
      //     logType: LogType.INFO,
      //     message: 'Substrate transaction submitted!',
      //     service: ServiceName.BLOCKCHAIN,
      //     data,
      //   },
      //   LogOutput.EVENT_INFO,
      // );
    } catch (err) {
      await this.writeEventLog(
        {
          logType: LogType.ERROR,
          message:
            '[Transmit Substrate Transaction Worker]: Error submitting transactions',
          service: ServiceName.BLOCKCHAIN,
          data: {
            data,
            err,
          },
          err,
        },
        LogOutput.NOTIFY_ALERT,
      );
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
      await this.writeEventLog(
        {
          logType: LogType.ERROR,
          message: 'Error sending messages to SQS',
          service: ServiceName.BLOCKCHAIN,
          data: {
            data,
            error: e,
          },
          err: e,
        },
        LogOutput.SYS_ERROR,
      );
    }
    return true;
  }
}
