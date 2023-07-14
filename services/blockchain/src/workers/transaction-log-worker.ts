import {
  ChainType,
  EvmChain,
  SerializeFor,
  SubstrateChain,
  dateToSqlString,
  Context,
  ServiceName,
  env,
  LogType,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  LogOutput,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { Wallet } from '../common/models/wallet';
import { DbTables, TxDirection } from '../config/types';
import { formatTokenWithDecimals, formatWalletAddress } from '../lib/utils';

import { TransactionLog } from '../modules/accounting/transaction-log.model';

import { EvmBlockchainIndexer } from '../modules/blockchain-indexers/evm/evm-indexer.service';
import { CrustBlockchainIndexer } from '../modules/blockchain-indexers/substrate/crust/crust-indexer.service';

export class TransactionLogWorker extends BaseQueueWorker {
  private batchLimit: number;

  public constructor(
    workerDefinition: WorkerDefinition,
    context: Context,
    type: QueueWorkerType,
  ) {
    super(workerDefinition, context, type, env.BLOCKCHAIN_AWS_WORKER_SQS_URL);
    this.batchLimit = workerDefinition?.parameters?.batchLimit || 100;
  }
  async runPlanner(_data?: any): Promise<any[]> {
    const wallets = await new Wallet({}, this.context).getAllWallets();

    return wallets.map((x) => {
      return {
        wallet: x.serialize(SerializeFor.WORKER),
        batchLimit: this.batchLimit,
      };
    });
  }

  async runExecutor(data: any): Promise<any> {
    const wallet = new Wallet(data.wallet, this.context);

    const lastBlock = await this.getLastLoggedBlockNumber(wallet);
    const transactions = await this.getTransactionsForWallet(
      wallet,
      lastBlock || 1,
      data.batchLimit,
    );

    await this.logTransactions(transactions);

    // link with transaction queue && alert if no link
    await this.linkTransactions(transactions, wallet);

    // check wallet ballance && alert if low
    await this.checkWalletBalance(wallet);

    if (transactions.length) {
      await this.writeEventLog(
        {
          logType: LogType.INFO,
          message: `Logged ${transactions.length} transactions for ${
            wallet.chainType === ChainType.EVM
              ? EvmChain[wallet.chain]
              : SubstrateChain[wallet.chain]
          }:${wallet.address}`,
          service: ServiceName.BLOCKCHAIN,
          data: {
            wallet: wallet.address,
          },
        },
        LogOutput.EVENT_INFO,
      );
    }
  }

  private async getLastLoggedBlockNumber(wallet: Wallet) {
    const res = await this.context.mysql.paramExecute(
      `
      SELECT MAX(blockId) as maxBlockId
      FROM \`${DbTables.TRANSACTION_LOG}\`
      WHERE chain = @chain
      AND chainType = @chainType
      AND wallet = @wallet
    `,
      {
        wallet: wallet.address,
        chain: wallet.chain,
        chainType: wallet.chainType,
      },
    );

    return res.length ? res[0].maxBlockId : 0;
  }

  private async getTransactionsForWallet(
    wallet: Wallet,
    lastBlock: number,
    limit = 100,
  ): Promise<Array<TransactionLog>> {
    const options = {
      [ChainType.EVM]: async () => {
        // get EVM transactions from indexer
        const res = await new EvmBlockchainIndexer(
          wallet.chain as EvmChain,
        ).getWalletTransactions(wallet.address, lastBlock, limit);

        // console.log(`Got ${res.transactions.length} EVM transactions!`);
        return res.transactions.map((x) =>
          new TransactionLog({}, this.context).createFromEvmIndexerData(
            x,
            wallet,
          ),
        );
      },

      [ChainType.SUBSTRATE]: async () => {
        // get substrate transaction from indexer
        // substrate chains has each own indexer
        const subOptions = {
          [SubstrateChain.CRUST]: async () => {
            const res = await new CrustBlockchainIndexer().getWalletTransfers(
              wallet.address,
              lastBlock,
              limit,
            );
            console.log(`Got ${res.transfers.length} Crust transfers!`);
            return (
              res.transfers
                .map((x) =>
                  new TransactionLog(
                    {},
                    this.context,
                  ).createFromCrustIndexerData(x, wallet),
                )
                // merge transfers that has the same hash
                .reduce((acc, tx) => {
                  const found = acc.find((x) => x.hash === tx.hash);
                  if (found) {
                    found.addToAmount(tx.amount);
                    found.calculateTotalPrice();
                  } else {
                    acc.push(tx);
                  }
                  return acc;
                }, [] as TransactionLog[])
            );
          },

          [SubstrateChain.KILT]: () => {
            // TODO: Add KILT support!!!!!
            // throw new Error('KILT is not supported yet!');
            console.log(`KILT LOG HANDLE: !THIS IS A TEST!`);
          },
          [SubstrateChain.PHALA]: () => {
            //
            throw new Error('PHALA is not supported yet!');
          },
        };
        return (await subOptions[wallet.chain]()) || false;
      },
    };

    const result = (await options[wallet.chainType]()) || false;

    if (!result) {
      throw new Error(
        `Unsupported transaction params: ${JSON.stringify(wallet.serialize())}`,
      );
    }

    return result;
  }

  private async logTransactions(transactions: TransactionLog[]) {
    if (!transactions.length) {
      console.log('No transactions to log');

      return;
    }
    // Write to transaction log
    const sql = `
    INSERT INTO \`${DbTables.TRANSACTION_LOG}\`
     (
      ts, blockId, status, direction,
      action, chain, chainType, wallet,
      addressFrom, addressTo, hash, token,
      amount, fee, totalPrice
    )
     VALUES ${transactions
       .map((x) => {
         return `(
          '${dateToSqlString(x.ts)}', ${x.blockId}, ${x.status}, ${x.direction},
        '${x.action}', ${x.chain}, ${x.chainType}, '${x.wallet}',
        '${x.addressFrom}', '${x.addressTo}', '${x.hash}', '${x.token}',
        '${x.amount}', '${x.fee || '0'}', '${x.totalPrice}'
        )`;
       })
       .join(',')}
     `;

    await this.context.mysql.paramExecute(sql);
  }

  private async linkTransactions(
    transactions: TransactionLog[],
    wallet: Wallet,
  ) {
    if (!transactions.length) {
      console.log('No transactions to link');

      return;
    }
    // link transaction log and transaction queue
    await this.context.mysql.paramExecute(
      `
      UPDATE 
        transaction_log tl 
        LEFT JOIN transaction_queue tq
        ON tq.transactionHash = tl.hash
      SET
        tl.transactionQueue_id = tq.id
      WHERE tq.id IS NOT NULL
      AND tl.hash IN (${transactions.map((x) => `'${x.hash}'`).join(',')})
      AND tl.chain = @chain
      AND tl.chainType = @chainType
      ;
    `,
      { chain: wallet.chain, chainType: wallet.chainType },
    );

    // find unlinked transactions
    const unlinked = await this.context.mysql.paramExecute(
      `
      SELECT * FROM transaction_log 
      WHERE transactionQueue_id IS NULL
      AND direction = ${TxDirection.COST}
      AND hash IN (${transactions.map((x) => `'${x.hash}'`).join(',')})
      AND chain = @chain
      AND chainType = @chainType
      ;
    `,
      { chain: wallet.chain, chainType: wallet.chainType },
    );

    if (unlinked.length) {
      await this.writeEventLog(
        {
          logType: LogType.WARN,
          message: `${
            unlinked.length
          } UNLINKED TRANSACTIONS DETECTED! ${formatWalletAddress(wallet)}`,
          service: ServiceName.BLOCKCHAIN,
          data: { wallet: wallet.address, hashes: unlinked.map((x) => x.hash) },
        },
        LogOutput.NOTIFY_ALERT,
      );
    }
  }

  private async checkWalletBalance(wallet: Wallet) {
    const balanceData = await wallet.checkBallance();

    if (!balanceData.minBalance) {
      await this.writeEventLog(
        {
          logType: LogType.WARN,
          message: `MIN BALLANCE IS NOT SET! ${formatWalletAddress(
            wallet,
          )}  ==> balance: ${formatTokenWithDecimals(
            balanceData.balance,
            wallet.chainType,
            wallet.chain,
          )}`,
          service: ServiceName.BLOCKCHAIN,
          data: { ...balanceData, wallet: wallet.address },
        },
        LogOutput.NOTIFY_WARN,
      );
    }

    if (balanceData.isBelowThreshold) {
      await this.writeEventLog(
        {
          logType: LogType.WARN,
          message: `LOW WALLET BALANCE! ${formatWalletAddress(
            wallet,
          )} ==> balance: ${formatTokenWithDecimals(
            balanceData.balance,
            wallet.chainType,
            wallet.chain,
          )} / ${formatTokenWithDecimals(
            balanceData.minBalance,
            wallet.chainType,
            wallet.chain,
          )}`,
          service: ServiceName.BLOCKCHAIN,
          data: { ...balanceData, wallet: wallet.address },
        },
        LogOutput.NOTIFY_ALERT,
      );
    }
  }
}
