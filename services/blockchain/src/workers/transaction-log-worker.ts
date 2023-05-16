import {
  ChainType,
  EvmChain,
  SerializeFor,
  SubstrateChain,
} from '@apillon/lib';
import { BaseQueueWorker } from '@apillon/workers-lib';
import { Wallet } from '../common/models/wallet';
import { DbTables } from '../config/types';
import { TransactionLog } from '../modules/accounting/transaction-log.model';

import { TransactionLogService } from '../modules/accounting/transaction-log.service';
import { EvmBlockchainIndexer } from '../modules/blockchain-indexers/evm/evm-indexer.service';
import { CrustBlockchainIndexer } from '../modules/blockchain-indexers/substrate/crust-indexer.service';

export class TransactionLogWorker extends BaseQueueWorker {
  async runPlanner(data?: any): Promise<any[]> {
    const wallets = await new Wallet({}, this.context).getAllWallets();

    return wallets.map((x) => x.serialize(SerializeFor.WORKER));
  }

  async runExecutor(data: any): Promise<any> {
    const wallet = new Wallet(data, this.context);

    const service = new TransactionLogService(wallet.chain, wallet.chainType);
    const lastBlock = await service.getLastLoggedBlockNumber(
      this.context,
      wallet.address,
    );
    const transactions = await this.getTransactionsForWallet(wallet, lastBlock);

    // Write to transaction log
    await this.context.mysql.paramExecute(`
      INSERT INTO \`${DbTables.TRANSACTION_LOG}\`
       (${new TransactionLog().generateInsertFields()})
       VALUES ${transactions
         .map(
           (x) =>
             `(${Object.values(x.serialize(SerializeFor.INSERT_DB)).join(
               ',',
             )})`,
         )
         .join(',')}
    `);

    // TODO: Check for any missing transactions and external transfers
  }

  private async getTransactionsForWallet(
    wallet: Wallet,
    lastBlock: number,
  ): Promise<Array<TransactionLog>> {
    const options = {
      [ChainType.EVM]: async () => {
        // get EVM transactions from indexer
        const res = await new EvmBlockchainIndexer(
          wallet.chain as EvmChain,
        ).getWalletTransactions(wallet.address, lastBlock);

        console.log(`Got ${res.transactions.length} EVM transactions!`);
        return res.transactions.map(
          (x) =>
            //todo
            x,
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
                    found.amount += tx.amount;
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
}
