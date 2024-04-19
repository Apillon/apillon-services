import {
  AppEnvironment,
  ChainType,
  Context,
  env,
  getChainName,
  LogType,
  ServiceName,
  TransactionStatus,
} from '@apillon/lib';
import {
  BaseWorker,
  Job,
  LogOutput,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { DbTables } from '../config/types';
import { SubstrateRpcApi } from '../modules/substrate/rpc-api';
import { ethers } from 'ethers';
import { getNextOnChainNonce } from '../modules/evm/evm.service';

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
        SELECT q.address,
               q.chain,
               q.chainType,
               min(q.nonce)      as minNonce,
               min(q.createTime) as minTime,
               w.id              as walletId,
               w.lastProcessedNonce,
               w.lastResetNonce,
               e.url             as endpointUrl
        FROM ${DbTables.TRANSACTION_QUEUE} as q
               LEFT JOIN ${DbTables.WALLET} as w
                         ON (q.address = w.address AND q.chain = w.chain AND
                             q.chainType = w.chainType)
               LEFT JOIN ${DbTables.ENDPOINT} as e
                         ON (q.chain = e.chain AND e.chainType = w.chainType)
        WHERE q.transactionStatus = @transactionStatus
          AND q.createTime < NOW() - INTERVAL 15 MINUTE
        GROUP BY q.address, q.chain, q.chaintype, e.url
      `,
      { transactionStatus: TransactionStatus.PENDING },
    );

    let message = '';
    for (const data of res) {
      // if we didn't reset yet or if we reset nonce in the past (for different nonce)
      if (data.lastResetNonce === null || data.minNonce > data.lastResetNonce) {
        const nextOnChainNonce = await this.getNextOnChainNonce(
          data.address,
          data.chainType,
          data.endpointUrl,
        );
        const lastProcessedNonce = nextOnChainNonce - 1;
        if (lastProcessedNonce < data.lastProcessedNonce) {
          console.log(
            `Last processed nonce was reset from ${data.lastProcessedNonce} to ${nextOnChainNonce} for ${data.address}.`,
          );
          await this.context.mysql.paramExecute(
            `
              UPDATE ${DbTables.WALLET}
              SET lastProcessedNonce=@nonce,
                  lastResetNonce    = @nonce
              WHERE id = @walletId
            `,
            { walletId: data.walletId, nonce: lastProcessedNonce },
          );
        }
      } else {
        message =
          message +
          `
          Wallet ${data.address} (chain ${getChainName(data.chainType, data.chain)})
          has pending transactions not resolved since ${data.minTime}, nonce: ${data.minNonce} \n
        `;
      }
    }

    if (message != '') {
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

  private async getNextOnChainNonce(
    address: string,
    chainType: ChainType,
    endpointUrl: string,
  ) {
    switch (chainType) {
      case ChainType.EVM: {
        const provider = new ethers.providers.JsonRpcProvider(endpointUrl);
        return await getNextOnChainNonce(provider, address);
      }
      case ChainType.SUBSTRATE: {
        const api = new SubstrateRpcApi(endpointUrl);
        try {
          return await api.getNextOnChainNonce(address);
        } finally {
          await api.destroy();
        }
      }
      default: {
        throw new Error(`Chain type ${chainType} is not supported`);
      }
    }
  }
}
