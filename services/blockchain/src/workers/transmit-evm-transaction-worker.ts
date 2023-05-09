import {
  AppEnvironment,
  Context,
  env,
  Lmas,
  LogType,
  ServiceName,
} from '@apillon/lib';
import {
  WorkerDefinition,
  WorkerLogStatus,
  BaseSingleThreadWorker,
  sendToWorkerQueue,
} from '@apillon/workers-lib';
import { BlockchainErrorCode } from '../config/types';
import { BlockchainCodeException } from '../lib/exceptions';
import { EvmService } from '../modules/evm/evm.service';
import { WorkerName } from './worker-executor';

export class TransmitEvmTransactionWorker extends BaseSingleThreadWorker {
  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);
  }

  public async runPlanner(): Promise<any[]> {
    return [];
  }
  public async runExecutor(data: any): Promise<any> {
    console.info('RUN EXECUTOR (TransmitEvmTransactionWorker). data: ', data);
    const chain = data?.chain;
    if (!chain) {
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.INVALID_DATA_PASSED_TO_WORKER,
        status: 500,
        details: data,
      });
    }

    try {
      await EvmService.transmitTransactions({ chain }, this.context);

      await new Lmas().writeLog({
        context: this.context,
        logType: LogType.COST,
        message: 'EVM transactions submitted',
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

    if (
      env.APP_ENV != AppEnvironment.LOCAL_DEV &&
      env.APP_ENV != AppEnvironment.TEST
    ) {
      try {
        await sendToWorkerQueue(
          env.BLOCKCHAIN_AWS_WORKER_SQS_URL,
          WorkerName.EVM_TRANSACTIONS,
          [{ chain: data?.chain }],
          null,
          null,
        );
      } catch (e) {
        await new Lmas().writeLog({
          logType: LogType.ERROR,
          message: 'Error triggering EVM_TRANSACTIONS worker queue',
          location: 'TransmitEvmTransactionWorker.runExecutor',
          service: ServiceName.BLOCKCHAIN,
          data: {
            error: e,
            chain: data?.chain,
          },
        });
      }
    }

    await this.writeLogToDb(
      WorkerLogStatus.INFO,
      `TransmitEvmTransactionWorker worker has been completed!`,
    );

    return true;
  }
}
