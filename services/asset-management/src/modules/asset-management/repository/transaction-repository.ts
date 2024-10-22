import { ServiceContext } from '@apillon/service-lib';
import { Transaction } from '../models/transaction.model';
import {
  PoolConnection,
  SerializeFor,
  WalletRefillTransactionQueryFilter,
} from '@apillon/lib';
import { AssetManagementModelValidationException } from '../../../lib/exceptions';

export class TransactionRepository {
  private readonly context: ServiceContext;

  constructor(context: ServiceContext) {
    this.context = context;
  }

  // public async populateByTransactionHash(
  //   transactionHash: string,
  // ): Promise<Transaction> {
  //   if (!transactionHash) {
  //     throw new Error('transactionHash should not be null!');
  //   }
  //   const data = await this.context.mysql.paramExecute(
  //     `
  //       SELECT *
  //       FROM \`${DbTables.TRANSACTION}\`
  //       WHERE transactionHash = @transactionHash;
  //     `,
  //     { transactionHash },
  //   );
  //   const transaction = new Transaction({}, this.context);
  //
  //   return data?.length
  //     ? transaction.populate(data[0], PopulateFrom.DB)
  //     : transaction.reset();
  // }

  async createTransaction(transaction: Transaction, conn?: PoolConnection) {
    await transaction.validateOrThrow(AssetManagementModelValidationException);

    await transaction.insert(SerializeFor.INSERT_DB, conn);

    return transaction;
  }

  async getList(query: WalletRefillTransactionQueryFilter) {
    return await new Transaction({}, this.context).getList(query);
  }
}
