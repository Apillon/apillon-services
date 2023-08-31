import {
  ChainType,
  EvmChain,
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
import { Wallet } from '../modules/wallet/wallet.model';
import { DbTables, TxAction, TxDirection } from '../config/types';
import {
  formatTokenWithDecimals,
  formatWalletAddress,
  getTokenPriceEur,
} from '../lib/utils';
import { TransactionLog } from '../modules/accounting/transaction-log.model';
import { EvmBlockchainIndexer } from '../modules/blockchain-indexers/evm/evm-indexer.service';
import { CrustBlockchainIndexer } from '../modules/blockchain-indexers/substrate/crust/crust-indexer.service';
import { KiltBlockchainIndexer } from '../modules/blockchain-indexers/substrate/kilt/kilt-indexer.service';
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

    return wallets.map((x) => ({
      wallet: { id: x.id, address: x.address },
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

          [SubstrateChain.KILT]: async () => {
            const indexer = new KiltBlockchainIndexer();

            const systems = await indexer.getSystemEventsWithLimit(
              wallet.address,
              lastBlock,
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
            // merge transfers that has the same hash (not happening in kilt?)
            // .reduce((acc, tx) => {
            //   const found = acc.find((x) => x.hash === tx.hash);
            //   if (found) {
            //     found.addToAmount(tx.amount);
            //     found.calculateTotalPrice();
            //   } else {
            //     acc.push(tx);
            //   }
            //   return acc;
            // }, [] as TransactionLog[])
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
    // Process wallet deposits
    for (const deposit of transactions.filter(
      (t) => t.action === TxAction.DEPOSIT && t.wallet === wallet.address,
    )) {
      try {
        await this.createWalletDeposit(wallet, deposit);
      } catch (err) {
        await this.sendErrorAlert(
          `Error creating deposit for ${formatWalletAddress(wallet)}`,
          { ...deposit },
          err,
        );
      }
    }

    // Process wallet token spends
    for (const spend of transactions.filter(
      (t) => t.action === TxAction.TRANSACTION && t.wallet === wallet.address,
    )) {
      try {
        const amount = ethers.BigNumber.from(spend.amount)
          .add(ethers.BigNumber.from(spend.fee || 0))
          .div(ethers.BigNumber.from(10).pow(wallet.decimals))
          .toNumber();
        await this.deductFromAvailableDeposit(wallet, amount);
      } catch (err) {
        await this.sendErrorAlert(
          `Error processing tx spend for ${formatWalletAddress(wallet)}`,
          { ...spend },
          err,
        );
      }
    }
  }

  private async createWalletDeposit(wallet: Wallet, deposit: TransactionLog) {
    const amount = deposit.amount
      ? ethers.BigNumber.from(deposit.amount)
          .add(ethers.BigNumber.from(deposit.fee || 0))
          .div(ethers.BigNumber.from(10).pow(wallet.decimals))
          .toNumber()
      : null;
    const walletDeposit = new WalletDeposit(
      {
        wallet_id: wallet.id,
        transactionHash: deposit.hash,
        depositAmount: amount,
        currentAmount: amount,
        pricePerToken: await getTokenPriceEur(wallet.token),
      },
      this.context,
    );
    try {
      await walletDeposit.validate();
    } catch (err) {
      await walletDeposit.handle(err);
      if (!walletDeposit.isValid()) {
        await this.sendErrorAlert(
          `INVALID WALLET DEPOSIT! ${formatWalletAddress(wallet)}`,
          {
            walletDeposit,
            error: walletDeposit.collectErrors().join(','),
          },
        );
      }
      return;
    }
    await walletDeposit.insert();
  }

  private async deductFromAvailableDeposit(
    wallet: Wallet,
    amount: number,
  ): Promise<void> {
    const availableDeposit = await new WalletDeposit(
      {},
      this.context,
    ).getOldestWithBalance(wallet.id);
    if (!availableDeposit.exists()) {
      return await this.sendErrorAlert(
        `NO AVAILABLE DEPOSIT! ${formatWalletAddress(wallet)}`,
        { wallet: wallet.address },
      );
    }
    if (availableDeposit.currentAmount - amount < 0) {
      amount -= availableDeposit.currentAmount;
      availableDeposit.currentAmount = 0;
      await availableDeposit.update();
      return this.deductFromAvailableDeposit(wallet, amount);
    }
    availableDeposit.currentAmount -= amount;
    await availableDeposit.update();
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
}
