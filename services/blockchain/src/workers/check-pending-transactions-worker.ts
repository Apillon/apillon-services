import {
  AppEnvironment,
  ChainType,
  Context,
  EvmChain,
  LogType,
  ServiceName,
  SubstrateChain,
  TransactionStatus,
  env,
} from '@apillon/lib';
import {
  BaseWorker,
  Job,
  LogOutput,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { DbTables } from '../config/types';

export class CheckPendingTransactionsWorker extends BaseWorker {
  protected context: Context;
  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);
  }

  public async before(_data?: any): Promise<any> {
    // No used
  }
  public async execute(data?: any): Promise<any> {
    this.logFn(`CheckPendingTransactionsWorker - execute BEGIN`);

    const res = await this.context.mysql.paramExecute(
      `
      SELECT address, chain, chaintype, min(nonce) as minNonce, min(createTime) as minTime
      FROM ${DbTables.TRANSACTION_QUEUE}
      WHERE transactionStatus = @transactionStatus
      AND createTime < NOW() - INTERVAL 15 MINUTE
      group by address, chain, chaintype
    `,
      { transactionStatus: TransactionStatus.PENDING },
    );

    if (res && res.length) {
      let message;
      for (let i = 0; i < res.length; i++) {
        message =
          message +
          `
          Wallet ${res[i].address} (chain ${res[i].chaintype == ChainType.EVM ? EvmChain[res[i].chain] : SubstrateChain[res[i].chain]})
          has pending transactions not resolved since ${res[i].minTime}, nonce: ${res[i].minNonce} \n
        `;
      }

      await this.writeEventLog(
        {
          logType: LogType.ERROR,
          message,
          service: ServiceName.BLOCKCHAIN,
          data: { wallets: res },
        },
        LogOutput.NOTIFY_ALERT,
      );
    }

    return true;
  }

  public async onSuccess(_data?: any, _successData?: any): Promise<any> {
    // this.logFn(`ClearLogs - success: ${data} | ${successData} `);
  }

  public async onError(error: Error): Promise<any> {
    this.logFn(`CheckPendingTransactionsWorker - error: ${error}`);
  }

  public async onUpdateWorkerDefinition(): Promise<void> {
    if (
      env.APP_ENV != AppEnvironment.LOCAL_DEV &&
      env.APP_ENV != AppEnvironment.TEST
    ) {
      await new Job({}, this.context).updateWorkerDefinition(
        this.workerDefinition,
      );
    }
  }

  public onAutoRemove(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
