import {
  ChainType,
  Context,
  dateToSqlString,
  env,
  EvmChain,
  formatWalletAddress,
  getTokenPriceUsd,
  LogType,
  PoolConnection,
  SerializeFor,
  ServiceName,
  SubstrateChain,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  LogOutput,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { formatTokenWithDecimals } from '@apillon/blockchain-lib/evm';
import { Wallet } from '../modules/wallet/wallet.model';
import { DbTables, TxDirection } from '../config/types';
import { TransactionLog } from '../modules/accounting/transaction-log.model';
import { EvmBlockchainIndexer } from '../modules/blockchain-indexers/evm/evm-indexer.service';
import { CrustBlockchainIndexer } from '../modules/blockchain-indexers/substrate/crust/indexer.service';
import { KiltBlockchainIndexer } from '../modules/blockchain-indexers/substrate/kilt/indexer.service';
import { WalletDeposit } from '../modules/accounting/wallet-deposit.model';
import { ethers } from 'ethers';
import { PhalaBlockchainIndexer } from '../modules/blockchain-indexers/substrate/phala/indexer.service';
import {
  SystemEvent,
  TransferTransaction,
} from '../modules/blockchain-indexers/substrate/data-models';
import { StorageOrderTransaction } from '../modules/blockchain-indexers/substrate/crust/data-models';
import { SubsocialBlockchainIndexer } from '../modules/blockchain-indexers/substrate/subsocial/indexer.service';
import { AstarSubstrateBlockchainIndexer } from '../modules/blockchain-indexers/substrate/astar/indexer.service';
import { AcurastBlockchainIndexer } from '../modules/blockchain-indexers/substrate/acurast/indexer.service';
import { UniqueBlockchainIndexer } from '../modules/blockchain-indexers/substrate/unique/indexer.service';

export class TransactionLogWorker extends BaseQueueWorker {
  public constructor(
    workerDefinition: WorkerDefinition,
    context: Context,
    type: QueueWorkerType,
  ) {
    super(workerDefinition, context, type, env.BLOCKCHAIN_AWS_WORKER_SQS_URL);
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
        seed: w.seed,
      },
    }));
  }

  async runExecutor(data: any): Promise<any> {
    const wallet = await new Wallet({}, this.context).populateById(
      data.wallet.id,
    );
    const formatedAddress = formatWalletAddress(
      wallet.chainType,
      wallet.chain,
      wallet.address,
    );
    await this.writeEventLog(
      {
        logType: LogType.INFO,
        message: `Processing transactions for ${formatedAddress}`,
        service: ServiceName.BLOCKCHAIN,
        data: {
          chainType: wallet.chainType,
          chain: wallet.chain,
          wallet: wallet.address,
        },
      },
      LogOutput.EVENT_INFO,
    );
    const transactions = await this.getTransactionsForWallet(
      wallet,
      wallet.lastLoggedBlock || 1,
    );

    await this.logTransactions(transactions);

    // link with transaction queue && alert if no link
    await this.linkTransactions(transactions, wallet);

    // add new wallet deposits and subtract amount from existing
    await this.processWalletDepositAmounts(wallet, transactions);

    // check wallet balance && alert if low
    await this.checkWalletBalance(wallet);

    await this.writeEventLog(
      {
        logType: LogType.INFO,
        message: `Processed ${transactions.length} transactions for ${formatedAddress}`,
        service: ServiceName.BLOCKCHAIN,
        data: {
          chainType: wallet.chainType,
          chain: wallet.chain,
          wallet: wallet.address,
        },
      },
      LogOutput.EVENT_INFO,
    );
  }

  private async getTransactionsForWallet(
    wallet: Wallet,
    lastBlock: number,
  ): Promise<Array<TransactionLog>> {
    const options = {
      [ChainType.EVM]: async () => {
        // get EVM transactions from indexer
        const indexer = new EvmBlockchainIndexer(wallet.chain as EvmChain);
        const blockHeight = await indexer.getBlockHeight();
        const toBlock =
          wallet.lastLoggedBlock + wallet.blockParseSize < blockHeight
            ? wallet.lastLoggedBlock + wallet.blockParseSize
            : blockHeight;
        const res = await indexer.getWalletTransactions(
          wallet.address,
          lastBlock,
          toBlock,
        );

        await wallet.updateLastLoggedBlock(toBlock);

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
            const blockHeight = await indexer.getBlockHeight();
            const toBlock =
              wallet.lastLoggedBlock + wallet.blockParseSize < blockHeight
                ? wallet.lastLoggedBlock + wallet.blockParseSize
                : blockHeight;
            const systems = await indexer.getAllSystemEvents(
              wallet.address,
              lastBlock,
              toBlock,
            );

            console.log(`Got ${systems.length} Crust system events!`);
            const { transfers, storageOrders } =
              await indexer.getAccountBalanceTransfersForTxs(
                wallet.address,
                lastBlock,
                toBlock,
              );
            console.log(
              `Got ${transfers.length} Crust transfers and ${storageOrders.length} storage orders!`,
            );
            // prepare transfer data
            const data: {
              system: SystemEvent;
              transfers: TransferTransaction[];
              storageOrder: StorageOrderTransaction;
            }[] = [];
            // collect transfers without system events (deposits)
            for (const transfer of transfers) {
              const systemEvent = systems.find(
                (s) =>
                  transfer.blockNumber === s.blockNumber &&
                  transfer.extrinsicHash === s.extrinsicHash,
              );
              if (systemEvent) {
                continue;
              }
              data.push({
                system: null,
                transfers: [transfer],
                storageOrder: null,
              });
            }
            // collect transfers with system events
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

            const transacionLogs = data.map((x) =>
              new TransactionLog({}, this.context).createFromCrustIndexerData(
                x,
                wallet,
              ),
            );

            await wallet.updateLastLoggedBlock(toBlock);

            return transacionLogs;
          },

          [SubstrateChain.KILT]: async () => {
            const indexer = new KiltBlockchainIndexer();
            const blockHeight = await indexer.getBlockHeight();
            const toBlock =
              wallet.lastLoggedBlock + wallet.blockParseSize < blockHeight
                ? wallet.lastLoggedBlock + wallet.blockParseSize
                : blockHeight;
            const systems = await indexer.getAllSystemEvents(
              wallet.address,
              lastBlock,
              toBlock,
            );
            console.log(`Got ${systems.length} Kilt system events!`);
            const transfers = await indexer.getAccountBalanceTransfersForTxs(
              wallet.address,
              lastBlock,
              toBlock,
            );
            console.log(`Got ${transfers.length} Kilt transfers!`);
            // prepare transfer data
            const data: {
              system: SystemEvent;
              transfer: TransferTransaction;
            }[] = [];
            // collect transfers without system events (deposits)
            for (const transfer of transfers) {
              const systemEvent = systems.find(
                (s) =>
                  transfer.blockNumber === s.blockNumber &&
                  transfer.extrinsicHash === s.extrinsicHash,
              );
              if (systemEvent) {
                continue;
              }
              data.push({
                system: null,
                transfer,
              });
            }
            // collect transfers with system events
            for (const s of systems) {
              const transfer = transfers.find(
                (t) =>
                  t.blockNumber === s.blockNumber &&
                  t.extrinsicHash === s.extrinsicHash,
              );
              data.push({ system: s, transfer });
            }
            const transactionLogs = data.map((x) =>
              new TransactionLog({}, this.context).createFromKiltIndexerData(
                x,
                wallet,
              ),
            );

            await wallet.updateLastLoggedBlock(toBlock);

            return transactionLogs;
          },
          [SubstrateChain.PHALA]: async () => {
            const indexer = new PhalaBlockchainIndexer();
            const blockHeight = await indexer.getBlockHeight();
            const toBlock =
              wallet.lastLoggedBlock + wallet.blockParseSize < blockHeight
                ? wallet.lastLoggedBlock + wallet.blockParseSize
                : blockHeight;
            const systems = await indexer.getAllSystemEvents(
              wallet.address,
              lastBlock,
              toBlock,
            );
            console.log(`Got ${systems.length} Phala system events!`);
            const { transfers } =
              await indexer.getAccountBalanceTransfersForTxs(
                wallet.address,
                lastBlock,
                toBlock,
              );
            console.log(`Got ${transfers.length} Phala transfers!`);
            // prepare transfer data
            const transactionLogs: TransactionLog[] = [];
            // collect transfers without system events (deposits)
            for (const transfer of transfers) {
              const systemEvent = systems.find(
                (s) =>
                  transfer.blockNumber === s.blockNumber &&
                  transfer.extrinsicHash === s.extrinsicHash,
              );
              if (systemEvent) {
                continue;
              }
              transactionLogs.push(
                new TransactionLog({}, this.context).createFromPhalaIndexerData(
                  {
                    system: null,
                    transfer,
                  },
                  wallet,
                ),
              );
            }
            // collect transfers with system events
            for (const s of systems) {
              const transfer = transfers.find(
                (t) =>
                  t.blockNumber === s.blockNumber &&
                  t.extrinsicHash === s.extrinsicHash,
              );
              transactionLogs.push(
                new TransactionLog({}, this.context).createFromPhalaIndexerData(
                  {
                    system: s,
                    transfer,
                  },
                  wallet,
                ),
              );
            }

            await wallet.updateLastLoggedBlock(toBlock);

            return transactionLogs;
          },
          [SubstrateChain.SUBSOCIAL]: async () => {
            const indexer = new SubsocialBlockchainIndexer();
            const blockHeight = await indexer.getBlockHeight();
            const toBlock =
              wallet.lastLoggedBlock + wallet.blockParseSize < blockHeight
                ? wallet.lastLoggedBlock + wallet.blockParseSize
                : blockHeight;
            const systems = await indexer.getAllSystemEvents(
              wallet.address,
              lastBlock,
              toBlock,
            );
            console.log(`Got ${systems.length} Subsocial system events!`);
            const { transfers } =
              await indexer.getAccountBalanceTransfersForTxs(
                wallet.address,
                lastBlock,
                toBlock,
              );
            console.log(`Got ${transfers.length} Subsocial transfers!`);
            // prepare transfer data
            const transactionLogs: TransactionLog[] = [];
            // collect transfers without system events (deposits)
            for (const transfer of transfers) {
              const systemEvent = systems.find(
                (s) =>
                  transfer.blockNumber === s.blockNumber &&
                  transfer.extrinsicHash === s.extrinsicHash,
              );
              if (systemEvent) {
                continue;
              }
              transactionLogs.push(
                new TransactionLog(
                  {},
                  this.context,
                ).createFromSubstrateIndexerData(
                  {
                    system: null,
                    transfer,
                  },
                  wallet,
                ),
              );
            }
            // collect transfers with system events
            for (const s of systems) {
              const transfer = transfers.find(
                (t) =>
                  t.blockNumber === s.blockNumber &&
                  t.extrinsicHash === s.extrinsicHash,
              );
              transactionLogs.push(
                new TransactionLog(
                  {},
                  this.context,
                ).createFromSubstrateIndexerData(
                  {
                    system: s,
                    transfer,
                  },
                  wallet,
                ),
              );
            }

            await wallet.updateLastLoggedBlock(toBlock);

            return transactionLogs;
          },
          [SubstrateChain.ASTAR]: async () => {
            const indexer = new AstarSubstrateBlockchainIndexer();
            const blockHeight = await indexer.getBlockHeight();
            const toBlock =
              wallet.lastLoggedBlock + wallet.blockParseSize < blockHeight
                ? wallet.lastLoggedBlock + wallet.blockParseSize
                : blockHeight;
            const systems = await indexer.getAllSystemEvents(
              wallet.address,
              lastBlock,
              toBlock,
            );
            console.log(`Got ${systems.length} Astar system events!`);
            const { transfers } =
              await indexer.getAccountBalanceTransfersForTxs(
                wallet.address,
                lastBlock,
                toBlock,
              );
            console.log(`Got ${transfers.length} Astar transfers!`);
            // prepare transfer data
            const transactionLogs: TransactionLog[] = [];
            // collect transfers without system events (deposits)
            for (const transfer of transfers) {
              const systemEvent = systems.find(
                (s) =>
                  transfer.blockNumber === s.blockNumber &&
                  transfer.extrinsicHash === s.extrinsicHash,
              );
              if (systemEvent) {
                continue;
              }
              transactionLogs.push(
                new TransactionLog(
                  {},
                  this.context,
                ).createFromSubstrateIndexerData(
                  {
                    system: null,
                    transfer,
                  },
                  wallet,
                ),
              );
            }
            // collect transfers with system events
            for (const s of systems) {
              const transfer = transfers.find(
                (t) =>
                  t.blockNumber === s.blockNumber &&
                  t.extrinsicHash === s.extrinsicHash,
              );
              transactionLogs.push(
                new TransactionLog(
                  {},
                  this.context,
                ).createFromSubstrateIndexerData(
                  {
                    system: s,
                    transfer,
                  },
                  wallet,
                ),
              );
            }

            await wallet.updateLastLoggedBlock(toBlock);

            return transactionLogs;
          },

          [SubstrateChain.ACURAST]: async () => {
            const indexer = new AcurastBlockchainIndexer();
            const blockHeight = await indexer.getBlockHeight();
            const toBlock =
              wallet.lastLoggedBlock + wallet.blockParseSize < blockHeight
                ? wallet.lastLoggedBlock + wallet.blockParseSize
                : blockHeight;
            const systems = await indexer.getAllSystemEvents(
              wallet.address,
              lastBlock,
              toBlock,
            );
            console.log(`Got ${systems.length} Acurast system events!`);
            const { transfers } =
              await indexer.getAccountBalanceTransfersForTxs(
                wallet.address,
                lastBlock,
                toBlock,
              );
            console.log(`Got ${transfers.length} Acurast transfers!`);
            // prepare transfer data
            const transactionLogs: TransactionLog[] = [];
            // collect transfers without system events (deposits)
            for (const transfer of transfers) {
              const systemEvent = systems.find(
                (s) =>
                  transfer.blockNumber === s.blockNumber &&
                  transfer.extrinsicHash === s.extrinsicHash,
              );
              if (systemEvent) {
                continue;
              }
              transactionLogs.push(
                new TransactionLog(
                  {},
                  this.context,
                ).createFromSubstrateIndexerData(
                  {
                    system: null,
                    transfer,
                  },
                  wallet,
                ),
              );
            }
            // collect transfers with system events
            for (const s of systems) {
              const transfer = transfers.find(
                (t) =>
                  t.blockNumber === s.blockNumber &&
                  t.extrinsicHash === s.extrinsicHash,
              );
              transactionLogs.push(
                new TransactionLog(
                  {},
                  this.context,
                ).createFromSubstrateIndexerData(
                  {
                    system: s,
                    transfer,
                  },
                  wallet,
                ),
              );
            }

            await wallet.updateLastLoggedBlock(toBlock);

            return transactionLogs;
          },

          [SubstrateChain.UNIQUE]: async () => {
            const indexer = new UniqueBlockchainIndexer();
            const blockHeight = await indexer.getBlockHeight();
            const toBlock =
              wallet.lastLoggedBlock + wallet.blockParseSize < blockHeight
                ? wallet.lastLoggedBlock + wallet.blockParseSize
                : blockHeight;
            const systems = await indexer.getAllSystemEvents(
              wallet.address,
              lastBlock,
              toBlock,
            );
            console.log(`Got ${systems.length} Unique system events!`);
            const { transfers } =
              await indexer.getAccountBalanceTransfersForTxs(
                wallet.address,
                lastBlock,
                toBlock,
              );
            console.log(`Got ${transfers.length} Unique transfers!`);
            // prepare transfer data
            const transactionLogs: TransactionLog[] = [];
            // collect transfers without system events (deposits)
            for (const transfer of transfers) {
              const systemEvent = systems.find(
                (s) =>
                  transfer.blockNumber === s.blockNumber &&
                  transfer.extrinsicHash === s.extrinsicHash,
              );
              if (systemEvent) {
                continue;
              }
              transactionLogs.push(
                new TransactionLog(
                  {},
                  this.context,
                ).createFromSubstrateIndexerData(
                  {
                    system: null,
                    transfer,
                  },
                  wallet,
                ),
              );
            }
            // collect transfers with system events
            for (const s of systems) {
              const transfer = transfers.find(
                (t) =>
                  t.blockNumber === s.blockNumber &&
                  t.extrinsicHash === s.extrinsicHash,
              );
              transactionLogs.push(
                new TransactionLog(
                  {},
                  this.context,
                ).createFromSubstrateIndexerData(
                  {
                    system: s,
                    transfer,
                  },
                  wallet,
                ),
              );
            }

            await wallet.updateLastLoggedBlock(toBlock);

            return transactionLogs;
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
     VALUES
      ${transactions
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

  public async processWalletDepositAmounts(
    wallet: Wallet,
    transactions: TransactionLog[],
  ) {
    // Process wallet deposits
    const deposits = transactions
      .filter(
        (t) =>
          t.direction === TxDirection.INCOME &&
          t.wallet.toLowerCase() === wallet.address.toLowerCase(),
      )
      .map((t) => new TransactionLog(t, this.context));

    console.log(
      `Found ${deposits.length} deposits for wallet ${wallet.seed}|${wallet.address}`,
    );

    let tokenPriceUsd: number;
    if (deposits.length > 0) {
      tokenPriceUsd = await getTokenPriceUsd(wallet.token);
    }
    for (const deposit of deposits) {
      const conn = await this.context.mysql.start();
      try {
        const value = this.getTotalValue(
          deposit.totalPrice,
          wallet.decimals,
          tokenPriceUsd,
        );

        await new WalletDeposit({}, this.context).createWalletDeposit(
          wallet,
          deposit,
          tokenPriceUsd,
          conn,
          (walletDeposit) =>
            this.sendErrorAlert(
              `INVALID WALLET DEPOSIT! ${formatWalletAddress(
                wallet.chainType,
                wallet.chain,
                wallet.address,
              )}`,
              {
                walletDeposit,
                error: walletDeposit.collectErrors().join(','),
              },
            ),
        );
        console.log(
          `Created wallet deposit for wallet ${wallet.seed}|${wallet.address} ==> ${deposit.amount}`,
        );
        await deposit.updateValueByHash(value, conn);

        console.log(
          `Update transaction log for deposit tx  ${deposit.id}|${deposit.hash}||${wallet.seed}|${wallet.address} ==> ${value}`,
        );

        await this.context.mysql.commit(conn);
      } catch (err) {
        await this.sendErrorAlert(
          `Error creating deposit for ${formatWalletAddress(
            wallet.chainType,
            wallet.chain,
            wallet.address,
          )}`,
          { ...deposit },
          LogType.ERROR,
          LogOutput.NOTIFY_ALERT,
          err,
        );
        await this.context.mysql.rollback(conn);
      }
    }

    // Process wallet token spends
    const spends = transactions
      .filter(
        (t) =>
          t.direction === TxDirection.COST &&
          t.wallet.toLowerCase() === wallet.address.toLowerCase(),
      )
      .map((t) => new TransactionLog(t, this.context));

    console.log(
      `Found ${spends.length} spends for wallet ${wallet.seed}|${wallet.address}`,
    );

    for (const spend of spends) {
      const conn = await this.context.mysql.start();
      try {
        const pricePerToken = await this.deductFromAvailableDeposit(
          wallet,
          spend.totalPrice,
          conn,
        );

        const value = this.getTotalValue(
          spend.totalPrice,
          wallet.decimals,
          pricePerToken,
        );
        await spend.updateValueByHash(value, conn);

        console.log(
          `Update transaction log for spend tx  ${spend.id}|${spend.hash}||${wallet.seed}|${wallet.address} ==> ${value}`,
        );

        await this.context.mysql.commit(conn);
      } catch (err) {
        await this.sendErrorAlert(
          `Error processing tx spend for ${formatWalletAddress(
            wallet.chainType,
            wallet.chain,
            wallet.address,
          )}`,
          { ...spend },
          LogType.ERROR,
          LogOutput.NOTIFY_ALERT,
          err,
        );
        await this.context.mysql.rollback(conn);
      }
    }
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
          ${DbTables.TRANSACTION_LOG} tl
            LEFT JOIN ${DbTables.TRANSACTION_QUEUE} tq
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
        SELECT *
        FROM ${DbTables.TRANSACTION_LOG}
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
        } UNLINKED TRANSACTIONS DETECTED! ${formatWalletAddress(
          wallet.chainType,
          wallet.chain,
          wallet.address,
        )}`,
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
          wallet.chainType,
          wallet.chain,
          wallet.address,
        )}  ==> balance: ${formatTokenWithDecimals(
          balanceData.balance,
          wallet.decimals,
        )}`,
        { ...balanceData, wallet: wallet.address },
        LogType.WARN,
        LogOutput.NOTIFY_WARN,
      );
    }

    if (balanceData.isBelowThreshold) {
      await this.sendErrorAlert(
        `LOW WALLET BALANCE! ${formatWalletAddress(
          wallet.chainType,
          wallet.chain,
          wallet.address,
        )} ==> balance: ${formatTokenWithDecimals(
          balanceData.balance,
          wallet.decimals,
        )} / ${formatTokenWithDecimals(
          balanceData.minBalance,
          wallet.decimals,
        )}`,
        { ...balanceData, wallet: wallet.address },
        LogType.WARN,
      );
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
        `NO AVAILABLE DEPOSIT! ${formatWalletAddress(
          wallet.chainType,
          wallet.chain,
          wallet.address,
        )}`,
        { wallet: wallet.address },
      );
      return 0;
    }
    const newAmount = this.subtractAmount(
      availableDeposit.currentAmount,
      amount,
    );
    if (newAmount.startsWith('-')) {
      // if amount is negative, set currentAmount to 0 and recursively deduct the remainder
      const remainder = this.subtractAmount(
        amount,
        availableDeposit.currentAmount,
      );
      availableDeposit.currentAmount = ethers.BigNumber.from(0).toString();
      await availableDeposit.update(SerializeFor.UPDATE_DB, conn);
      return this.deductFromAvailableDeposit(wallet, remainder, conn);
    }
    availableDeposit.currentAmount = newAmount;
    await availableDeposit.update(SerializeFor.UPDATE_DB, conn);
    return availableDeposit.pricePerToken;
  }

  private sendErrorAlert(
    message: string,
    data: any,
    logType = LogType.ERROR,
    logOutput = LogOutput.NOTIFY_ALERT,
    err?: Error,
  ) {
    return this.writeEventLog(
      {
        logType,
        message,
        service: ServiceName.BLOCKCHAIN,
        data,
        err,
      },
      logOutput,
    );
  }

  private getTotalValue(
    totalPrice: string,
    decimals: number,
    pricePerToken: number,
  ) {
    const divisor = ethers.BigNumber.from(10).pow(decimals);
    const tokensAmount = ethers.BigNumber.from(totalPrice)
      .div(divisor)
      .toNumber();
    const value = tokensAmount * pricePerToken;

    return Math.round(value * 10_000) / 10_000; // Round value to 4 decimals
  }

  private subtractAmount(amount1: string, amount2: string): string {
    return ethers.BigNumber.from(amount1)
      .sub(ethers.BigNumber.from(amount2))
      .toString();
  }
}
