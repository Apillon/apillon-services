import {
  ChainType,
  EvmChain,
  SubstrateChain,
  dateToSqlString,
  Context,
  ServiceName,
  env,
  LogType,
  PoolConnection,
  SerializeFor,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  LogOutput,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { Wallet } from '../modules/wallet/wallet.model';
import { DbTables, TxDirection } from '../config/types';
import {
  formatTokenWithDecimals,
  formatWalletAddress,
  getTokenPriceUsd,
} from '../lib/utils';
import { TransactionLog } from '../modules/accounting/transaction-log.model';
import { EvmBlockchainIndexer } from '../modules/blockchain-indexers/evm/evm-indexer.service';
import { CrustBlockchainIndexer } from '../modules/blockchain-indexers/substrate/crust/indexer.service';
import { KiltBlockchainIndexer } from '../modules/blockchain-indexers/substrate/kilt/indexer.service';
import { WalletDeposit } from '../modules/accounting/wallet-deposit.model';
import { ethers } from 'ethers';

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
    const wallets = await new Wallet({}, this.context).getWallets();

    return wallets.map((w) => ({
      wallet: {
        id: w.id,
        address: w.address,
        token: w.token,
        decimals: w.decimals,
        chain: w.chain,
        chainType: w.chainType,
      },
      batchLimit: this.batchLimit,
    }));
  }

  async runExecutor(data: any): Promise<any> {
    const wallet = await new Wallet({}, this.context).populateById(
      data.wallet.id,
    );

    const lastBlock = await this.getLastLoggedBlockNumber(wallet);
    const transactions = await this.getTransactionsForWallet(
      wallet,
      lastBlock || 1,
      data.batchLimit,
    );

    await this.logTransactions(transactions);

    // link with transaction queue && alert if no link
    await this.linkTransactions(transactions, wallet);

    // add new wallet deposits and subtract amount from existing
    await this.processWalletDepositAmounts(wallet, transactions);

    // check wallet balance && alert if low
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
            const indexer = new CrustBlockchainIndexer();

            const systems = await indexer.getAllSystemEvents(
              wallet.address,
              lastBlock,
              undefined,
              limit,
            );

            console.log(`Got ${systems.length} Crust system events!`);
            const { transfers, storageOrders } =
              await indexer.getAccountBalanceTransfersForTxs(
                wallet.address,
                systems.map((x) => x.extrinsicHash),
              );
            console.log(
              `Got ${transfers.length} Crust transfers and ${storageOrders.length} storage orders!`,
            );
            // prepare transfer data
            const data = [];
            for (const s of systems) {
              const filteredTransfers = transfers.filter(
                (t) =>
                  t.blockNumber === s.blockNumber &&
                  t.extrinsicHash === s.extrinsicHash,
              );
              const storageOrder = storageOrders.find(
                (t) =>
                  t.blockNumber === s.blockNumber &&
                  t.extrinsicHash === s.extrinsicHash,
              );

              data.push({
                system: s,
                transfers: filteredTransfers,
                storageOrder,
              });
            }
            return data.map((x) =>
              new TransactionLog({}, this.context).createFromCrustIndexerData(
                x,
                wallet,
              ),
            );
          },

          [SubstrateChain.KILT]: async () => {
            const indexer = new KiltBlockchainIndexer();

            const systems = await indexer.getAllSystemEvents(
              wallet.address,
              lastBlock,
              undefined,
              limit,
            );
            console.log(`Got ${systems.length} Kilt system events!`);
            const transfers = await indexer.getAccountBalanceTransfersForTxs(
              wallet.address,
              systems.map((x) => x.extrinsicHash),
            );
            console.log(`Got ${transfers.length} Kilt transfers!`);
            // prepare transfer data
            const data = [];
            for (const s of systems) {
              const transfer = transfers.find(
                (t) =>
                  t.blockNumber === s.blockNumber &&
                  t.extrinsicHash === s.extrinsicHash,
              );

              data.push({ system: s, transfer });
            }
            return data.map((x) =>
              new TransactionLog({}, this.context).createFromKiltIndexerData(
                x,
                wallet,
              ),
            );
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
    INSERT IGNORE INTO \`${DbTables.TRANSACTION_LOG}\`
     (
      ts, blockId, status, direction,
      action, chain, chainType, wallet,
      addressFrom, addressTo, hash, token,
      amount, fee, totalPrice
    )
     VALUES ${transactions
       .map(
         (x) => `(
          '${dateToSqlString(x.ts)}', ${x.blockId}, ${x.status}, ${x.direction},
        '${x.action}', ${x.chain}, ${x.chainType}, '${x.wallet}',
        ${x.addressFrom ? `'${x.addressFrom}'` : 'NULL'},
        ${x.addressTo ? `'${x.addressTo}'` : 'NULL'},
        '${x.hash}', '${x.token}',
        '${x.amount || 0}', '${x.fee || 0}', '${x.totalPrice}'
        )`,
       )
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
        tl.transactionQueue_id = tq.id,
        tl.project_uuid = tq.project_uuid
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
      await this.sendErrorAlert(
        `${
          unlinked.length
        } UNLINKED TRANSACTIONS DETECTED! ${formatWalletAddress(wallet)}`,
        { wallet: wallet.address, hashes: unlinked.map((x) => x.hash) },
        LogType.WARN,
      );
    }
  }

  private async checkWalletBalance(wallet: Wallet) {
    const balanceData = await wallet.checkAndUpdateBalance();

    if (!balanceData.minBalance) {
      await this.sendErrorAlert(
        `MIN BALANCE IS NOT SET! ${formatWalletAddress(
          wallet,
        )}  ==> balance: ${formatTokenWithDecimals(
          balanceData.balance,
          wallet.chainType,
          wallet.chain,
        )}`,
        { ...balanceData, wallet: wallet.address },
        LogType.WARN,
        LogOutput.NOTIFY_WARN,
      );
    }

    if (balanceData.isBelowThreshold) {
      await this.sendErrorAlert(
        `LOW WALLET BALANCE! ${formatWalletAddress(
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
        { ...balanceData, wallet: wallet.address },
        LogType.WARN,
      );
    }
  }

  public async processWalletDepositAmounts(
    wallet: Wallet,
    transactions: TransactionLog[],
  ) {
    const tokenPriceUsd = await getTokenPriceUsd(wallet.token);
    // Process wallet deposits
    for (const deposit of transactions
      .filter(
        (t) =>
          t.direction === TxDirection.INCOME && t.wallet === wallet.address,
      )
      .map((t) => new TransactionLog(t, this.context))) {
      const conn = await this.context.mysql.start();
      try {
        const valueUsd =
          ethers.BigNumber.from(deposit.totalPrice)
            .div(ethers.BigNumber.from(10).pow(wallet.decimals))
            .toNumber() * tokenPriceUsd;

        await new WalletDeposit({}, this.context).createWalletDeposit(
          wallet,
          deposit,
          tokenPriceUsd,
          conn,
          (walletDeposit) =>
            this.sendErrorAlert(
              `INVALID WALLET DEPOSIT! ${formatWalletAddress(wallet)}`,
              {
                walletDeposit,
                error: walletDeposit.collectErrors().join(','),
              },
            ),
        );
        await deposit
          .populate({ value: valueUsd })
          .update(SerializeFor.UPDATE_DB, conn);

        await this.context.mysql.commit(conn);
      } catch (err) {
        await this.sendErrorAlert(
          `Error creating deposit for ${formatWalletAddress(wallet)}`,
          { ...deposit },
          err,
        );
        await this.context.mysql.rollback(conn);
      }
    }

    // Process wallet token spends
    for (const spend of transactions
      .filter(
        (t) => t.direction === TxDirection.COST && t.wallet === wallet.address,
      )
      .map((t) => new TransactionLog(t, this.context))) {
      const conn = await this.context.mysql.start();
      try {
        const pricePerToken = await this.deductFromAvailableDeposit(
          wallet,
          spend.totalPrice,
          conn,
        );
        const valueUsd =
          ethers.BigNumber.from(spend.totalPrice)
            .div(ethers.BigNumber.from(10).pow(wallet.decimals))
            .toNumber() * pricePerToken;

        await spend
          .populate({ value: valueUsd })
          .update(SerializeFor.UPDATE_DB, conn);

        await this.context.mysql.commit(conn);
      } catch (err) {
        await this.sendErrorAlert(
          `Error processing tx spend for ${formatWalletAddress(wallet)}`,
          { ...spend },
          err,
        );
        await this.context.mysql.rollback(conn);
      }
    }
  }

  private async deductFromAvailableDeposit(
    wallet: Wallet,
    amount: string,
    conn: PoolConnection,
  ): Promise<number> {
    const availableDeposit = await new WalletDeposit(
      {},
      this.context,
    ).getOldestWithBalance(wallet.id, conn);
    if (!availableDeposit.exists()) {
      await this.sendErrorAlert(
        `NO AVAILABLE DEPOSIT! ${formatWalletAddress(wallet)}`,
        { wallet: wallet.address },
      );
      return;
    }
    if (
      this.subtractAmount(availableDeposit.currentAmount, amount).startsWith(
        '-',
      )
    ) {
      // if amount is negative, set currentAmount to 0 and recursively deduct the remainder
      amount = this.subtractAmount(amount, availableDeposit.currentAmount);
      availableDeposit.currentAmount = ethers.BigNumber.from(0).toString();
      await availableDeposit.update(SerializeFor.UPDATE_DB, conn);
      return this.deductFromAvailableDeposit(wallet, amount, conn);
    }
    availableDeposit.currentAmount = this.subtractAmount(
      availableDeposit.currentAmount,
      amount,
    );
    await availableDeposit.update(SerializeFor.UPDATE_DB, conn);
    return availableDeposit.pricePerToken;
  }

  private sendErrorAlert(
    message: string,
    data: any,
    logType = LogType.ERROR,
    logOutput = LogOutput.NOTIFY_ALERT,
  ) {
    return this.writeEventLog(
      {
        logType,
        message,
        service: ServiceName.BLOCKCHAIN,
        data,
      },
      logOutput,
    );
  }

  private subtractAmount(amount1: string, amount2: string): string {
    return ethers.BigNumber.from(amount1)
      .sub(ethers.BigNumber.from(amount2))
      .toString();
  }
}
