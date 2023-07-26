import {
  AppEnvironment,
  Context,
  env,
  LogType,
  ServiceName,
} from '@apillon/lib';
import {
  WorkerDefinition,
  BaseSingleThreadWorker,
  sendToWorkerQueue,
  LogOutput,
} from '@apillon/workers-lib';
import { BlockchainErrorCode } from '../config/types';
import { BlockchainCodeException } from '../lib/exceptions';
import { EvmService } from '../modules/evm/evm.service';
import { WorkerName } from './worker-executor';
import { evmChainToJob } from '../lib/helpers';

/**
 * TODO: error logging:
 * await new Lmas().sendAdminAlert(
      ':wave: Hello from the other side!',
      ServiceName.DEV_CONSOLE,
      'message',
    );
 */
export class TransmitEvmTransactionWorker extends BaseSingleThreadWorker {
  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);
  }

  public async runPlanner(): Promise<any[]> {
    return [];
  }
  public async runExecutor(data: any): Promise<any> {
    // console.info('RUN EXECUTOR (TransmitEvmTransactionWorker). data: ', data);
    const chain = data?.chain; // todo: move to workerDefinition.parameters
    if (!chain) {
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.INVALID_DATA_PASSED_TO_WORKER,
        status: 500,
        details: data,
      });
    }

    try {
      await EvmService.transmitTransactions(
        { chain },
        this.context,
        async (...args) => await this.writeEventLog.call(this, ...args),
      );
    } catch (err) {
      await this.writeEventLog(
        {
          logType: LogType.ERROR,
          message: 'Error submitting transactions',
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

    if (
      env.APP_ENV != AppEnvironment.LOCAL_DEV &&
      env.APP_ENV != AppEnvironment.TEST
    ) {
      try {
        await sendToWorkerQueue(
          env.BLOCKCHAIN_AWS_WORKER_SQS_URL,
          WorkerName.EVM_TRANSACTIONS,
          [{ chain: data?.chain }],
          evmChainToJob(data?.chain, WorkerName.EVM_TRANSACTIONS),
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
    }
    return true;
  }
}
