import {
  Context,
  LogType,
  ServiceName,
  SubstrateChain,
  getEnumKey,
  writeLog,
} from '@apillon/lib';
import {
  WorkerDefinition,
  BaseSingleThreadWorker,
  LogOutput,
} from '@apillon/workers-lib';
import { BlockchainErrorCode } from '../config/types';
import { BlockchainCodeException } from '../lib/exceptions';
import { SubstrateService } from '../modules/substrate/substrate.service';

export class TransmitSubstrateTransactionWorker extends BaseSingleThreadWorker {
  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);
    this.logPrefix = '[Transmit Substrate Transaction Worker]';
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
        async (...args) => await this.writeEventLog.call(this, ...args),
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
          message: `Error submitting transactions on chain ${getEnumKey(
            SubstrateChain,
            chain,
          )}`,
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

    writeLog(LogType.INFO, 'TransmitSubstrateTranscationWorker finished');

    // try {
    //   await sendToWorkerQueue(
    //     env.BLOCKCHAIN_AWS_WORKER_SQS_URL,
    //     WorkerName.CRUST_TRANSACTIONS,
    //     [{}],
    //     null,
    //     null,
    //   );
    // } catch (e) {
    //   await this.writeEventLog(
    //     {
    //       logType: LogType.ERROR,
    //       message: 'Error sending messages to SQS',
    //       service: ServiceName.BLOCKCHAIN,
    //       data: {
    //         data,
    //         error: e,
    //       },
    //       err: e,
    //     },
    //     LogOutput.SYS_ERROR,
    //   );
    // }
    return true;
  }
}
