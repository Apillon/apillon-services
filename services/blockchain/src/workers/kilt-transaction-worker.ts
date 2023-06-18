import {
  ChainType,
  Context,
  env,
  Lmas,
  LogType,
  PoolConnection,
  ServiceName,
  SubstrateChain,
  TransactionStatus,
} from '@apillon/lib';
import {
  BaseSingleThreadWorker,
  sendToWorkerQueue,
  WorkerDefinition,
  WorkerLogStatus,
} from '@apillon/workers-lib';
import { Transaction } from '../common/models/transaction';
import { Wallet } from '../common/models/wallet';
import {
  AttestTransactions,
  DbTables,
  DidTransactions,
  KiltTransactionType,
  TransfersTransactions,
} from '../config/types';
import { BlockchainStatus } from '../modules/blockchain-indexers/blockchain-status';
import {
  DidTransaction,
  TransferTransaction,
} from '../modules/blockchain-indexers/substrate/kilt/data-models/kilt-transactions';
import { WorkerName } from './worker-executor';
import { KiltBlockchainIndexer } from '../modules/blockchain-indexers/substrate/kilt/kilt-indexer.service';

export class KiltTransactionWorker extends BaseSingleThreadWorker {
  private logPrefix: string;
  private kiltIndexer: KiltBlockchainIndexer;

  public constructor(workerDefinition: WorkerDefinition, context: Context) {
    super(workerDefinition, context);

    this.logPrefix = `[SUBSTRATE | KILT]`;
    this.kiltIndexer = new KiltBlockchainIndexer();
  }

  private log(message: any) {
    console.log(`${this.logPrefix}: ${message}`);
  }

  public async runExecutor(_data: any): Promise<any> {
    const wallets = await new Wallet({}, await this.context).getList(
      SubstrateChain.KILT,
      ChainType.SUBSTRATE,
    );

    this.log(`RUN EXECUTOR (KiltTransactionWorker)`);

    for (const w of wallets) {
      const conn = await this.context.mysql.start();

      try {
        const wallet: Wallet = new Wallet(w, this.context);

        const blockHeight = await this.kiltIndexer.getBlockHeight();

        const lastParsedBlock: number = wallet.lastParsedBlock;
        const toBlock: number =
          lastParsedBlock + wallet.blockParseSize < blockHeight
            ? lastParsedBlock + wallet.blockParseSize
            : blockHeight;

        this.log(
          `Checking PENDING transactions (sourceWallet=${wallet.address}, lastParsedBlock=${wallet.lastParsedBlock}, toBlock=${toBlock})..`,
        );

        const { balanceTransactions, didTransactions, attestTransactions } =
          await this.fetchAllKiltTransactions(
            await this.kiltIndexer,
            wallet.address,
            lastParsedBlock,
            toBlock,
          );

        await this.handleBlockchainTransfers(wallet, conn, balanceTransactions);

        /*
        await await kiltIndexer.handleBlockchainTransfers(
          wallet,
          kiltTransactions.withdrawals,
          kiltTransactions.deposits,
          conn,
        );

        await await kiltIndexer.handleKiltFileOrders(
          wallet,
          kiltTransactions.fileOrders,
          conn,
        );
        */

        await wallet.updateLastParsedBlock(toBlock, conn);
        await conn.commit();

        // if (kiltTransactions.withdrawals.transfers.length > 0) {
        //   await sendToWorkerQueue(
        //     env.BLOCKCHAIN_AWS_WORKER_SQS_URL,
        //     WorkerName.TRANSACTION_WEBHOOKS,
        //     [{}],
        //     null,
        //     null,
        //   );

        //   await await kiltIndexer.writeLogToDb(
        //     WorkerLogStatus.INFO,
        //     'Found new transactions. Triggering transaction webhook worker!',
        //     {
        //       transfers: kiltTransactions.withdrawals.transfers,
        //       wallet: wallet.address,
        //     },
        //   );
        // }

        console.log(
          `[SUBSTRATE][KILT] Checking PENDING transactions (sourceWallet=${wallet.address}, lastProcessedBlock=${toBlock}) FINISHED!`,
        );
      } catch (err) {
        await conn.rollback();

        await this.writeLogToDb(
          WorkerLogStatus.ERROR,
          'Checking transactions FAILED!',
          { wallet: wallets.address },
          err,
        );
        await new Lmas().writeLog({
          logType: LogType.ERROR,
          message: 'Error confirming transactions',
          location: 'KiltTransactionWorker',
          service: ServiceName.BLOCKCHAIN,
          data: {
            error: err,
            wallet: wallets.address,
          },
        });
        await new Lmas().sendAdminAlert(
          `${this.logPrefix}: Error confirming transactions!`,
          ServiceName.BLOCKCHAIN,
          'alert',
        );
      }
    }
  }

  public async handleBlockchainTransfers(
    wallet: Wallet,
    conn: PoolConnection,
    transactions: TransfersTransactions,
  ) {
    // if (!transfers.length) {
    //   console.log(
    //     `[SUBSTRATE][KILT] There are no new deposits to wallet (address=${wallet.address}).`,
    //   );
    //   return;
    // }
    console.log('Hello There TRANSFER');
    console.log('transactions: ', transactions);
  }

  public async handleBlockchainDidTransactions(
    wallet: Wallet,
    conn: PoolConnection,
    transactions: DidTransactions,
  ) {
    // if (!transfers.length) {
    //   console.log(
    //     `[SUBSTRATE][KILT] There are no new deposits to wallet (address=${wallet.address}).`,
    //   );
    //   return;
    // }
    console.log('Hello There DID');
  }

  public async handleBlockchainAttestTransaction(
    wallet: Wallet,
    conn: PoolConnection,
    transactions: AttestTransactions,
  ) {
    console.log('Hello There ATTEST');
  }

  /**
   * Obtain kilt transactions
   * @param address transactions created from wallet address
   * @param fromBlock transactions included from block number
   * @param toBlock transactions included to block number
   */
  public async fetchAllKiltTransactions(
    kiltIndexer: KiltBlockchainIndexer,
    address: string,
    fromBlock: number,
    toBlock: number,
  ) {
    // Get all transfers
    const balanceTransactions = {
      TRANSFER: await kiltIndexer.getAccountTransfers(
        address,
        fromBlock,
        toBlock,
      ),
      WITHDRAWAL: await kiltIndexer.getAccountWithdrawals(
        address,
        fromBlock,
        toBlock,
      ),
      DEPOSIT: await kiltIndexer.getAccountDeposits(
        address,
        fromBlock,
        toBlock,
      ),
      RESERVED_BALANCES: await kiltIndexer.getAccountReserved(
        address,
        fromBlock,
        toBlock,
      ),
    } as TransfersTransactions;

    // All attestation transactions
    const attestTransactions = {
      CREATE: await kiltIndexer.getAccountAttestCreate(
        address,
        fromBlock,
        toBlock,
      ),
      REMOVE: await kiltIndexer.getAccountAttestRemove(
        address,
        fromBlock,
        toBlock,
      ),
      REVOKE: await kiltIndexer.getAccountAttestRevoke(
        address,
        fromBlock,
        toBlock,
      ),
    } as AttestTransactions;

    // Get all DID transactions
    const didTransactions = {
      CREATE: await kiltIndexer.getAccountDidCreate(
        address,
        fromBlock,
        toBlock,
      ),
      DELETE: await kiltIndexer.getAccountDidDelete(
        address,
        fromBlock,
        toBlock,
      ),
      UPDATE: await kiltIndexer.getAccountDidUpdate(
        address,
        fromBlock,
        toBlock,
      ),
    } as DidTransactions;

    return { balanceTransactions, didTransactions, attestTransactions };
  }
}
