import {
  ChainType,
  EvmChain,
  SerializeFor,
  SubstrateChain,
  dateToSqlString,
  Context,
  Lmas,
  ServiceName,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  QueueWorkerType,
  WorkerDefinition,
  WorkerLogStatus,
} from '@apillon/workers-lib';
import { ethers } from 'ethers';
import { Endpoint } from '../common/models/endpoint';
import { Wallet } from '../common/models/wallet';
import { BlockchainErrorCode, Chain, DbTables } from '../config/types';
import { BlockchainCodeException } from '../lib/exceptions';
import {
  TransactionLog,
  TxDirection,
} from '../modules/accounting/transaction-log.model';

import { TransactionLogService } from '../modules/accounting/transaction-log.service';
import { EvmBlockchainIndexer } from '../modules/blockchain-indexers/evm/evm-indexer.service';
import { CrustBlockchainIndexer } from '../modules/blockchain-indexers/substrate/crust-indexer.service';

export class TransactionLogWorker extends BaseQueueWorker {
  private batchLimit: number;

  public constructor(
    workerDefinition: WorkerDefinition,
    context: Context,
    type: QueueWorkerType,
    queueUrl: string,
  ) {
    super(workerDefinition, context, type, queueUrl);
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

    const service = new TransactionLogService(wallet.chain, wallet.chainType);
    const lastBlock = await service.getLastLoggedBlockNumber(
      this.context,
      wallet.address,
    );
    const transactions = await this.getTransactionsForWallet(
      wallet,
      lastBlock || 1,
      data.batchLimit,
    );

    await this.logTransactions(transactions);

    // link with transaction queue && alert if no link
    await this.linkTransactions(transactions, wallet.chain);

    // check wallet ballance && alert if low
    await this.checkWalletBalance(wallet);

    if (transactions.length) {
      await this.writeLogToDb(
        WorkerLogStatus.SUCCESS,
        `Logged ${transactions.length} transactions for ${
          wallet.chainType === ChainType.EVM
            ? EvmChain[wallet.chain]
            : SubstrateChain[wallet.chain]
        }:${wallet.address}`,
      );
    }
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

        console.log(`Got ${res.transactions.length} EVM transactions!`);
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
            //
            throw new Error('KILT is not supported yet!');
          },
          [SubstrateChain.KILT_SPIRITNET]: () => {
            //
            throw new Error('KILT SPIRITNET is not supported yet!');
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
    console.log(sql);
    await this.context.mysql.paramExecute(sql);
  }

  private async linkTransactions(transactions: TransactionLog[], chain: Chain) {
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
      ;
    `,
      { chain },
    );

    // find unlinked transactions
    const unlinked = await this.context.mysql.paramExecute(
      `
      SELECT * FROM transaction_log 
      WHERE transactionQueue_id IS NULL
      AND direction = ${TxDirection.COST}
      AND hash IN (${transactions.map((x) => `'${x.hash}'`).join(',')})
      AND chain = @chain
      ;
    `,
      { chain },
    );

    if (unlinked.length) {
      await this.writeLogToDb(
        WorkerLogStatus.WARNING,
        `${unlinked.length} UNLINKED TRANSACTIONS DETECTED! (wallet: ${transactions[0].wallet})`,
        { wallet: transactions[0].wallet, hashes: unlinked.map((x) => x.hash) },
      );
      await new Lmas().sendAdminAlert(
        `${unlinked.length} UNLINKED TRANSACTIONS DETECTED! (wallet: ${transactions[0].wallet})`,
        ServiceName.BLOCKCHAIN,
        'alert',
      );
    }
  }

  private async checkWalletBalance(wallet: Wallet) {
    const balanceData = await wallet.checkBallance();

    if (!balanceData.minBalance) {
      await this.writeLogToDb(
        WorkerLogStatus.WARNING,
        `MIN BALLANCE IS NOT SET! ${
          wallet.chainType === ChainType.EVM
            ? EvmChain[wallet.chain]
            : SubstrateChain[wallet.chain]
        }:${wallet.address}`,
        balanceData,
      );

      await new Lmas().sendAdminAlert(
        `MIN BALLANCE IS NOT SET! ${
          wallet.chainType === ChainType.EVM
            ? EvmChain[wallet.chain]
            : SubstrateChain[wallet.chain]
        }:${wallet.address} ==> balance: ${balanceData.balance}`,
        ServiceName.BLOCKCHAIN,
        'warning',
      );
    }

    if (balanceData.isBelowThreshold) {
      await this.writeLogToDb(
        WorkerLogStatus.WARNING,
        `LOW WALLET BALANCE! ${
          wallet.chainType === ChainType.EVM
            ? EvmChain[wallet.chain]
            : SubstrateChain[wallet.chain]
        }:${wallet.address}`,
        balanceData,
      );

      await new Lmas().sendAdminAlert(
        `LOW WALLET BALANCE! ${
          wallet.chainType === ChainType.EVM
            ? EvmChain[wallet.chain]
            : SubstrateChain[wallet.chain]
        }:${wallet.address} ==> balance: ${balanceData.balance}/${
          balanceData.minBalance
        }`,
        ServiceName.BLOCKCHAIN,
        'alert',
      );
    }
  }
}
