import { PoolConnection, SerializeFor } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { ComputingValidationException } from '../../lib/exceptions';
import { Transaction } from './models/transaction.model';

export class TransactionService {
  static async saveTransaction(
    context: ServiceContext,
    transaction: Transaction,
    conn: PoolConnection,
  ) {
    try {
      await transaction.validate();
    } catch (err) {
      await transaction.handle(err);
      if (!transaction.isValid()) {
        throw new ComputingValidationException(transaction);
      }
    }
    await transaction.insert(SerializeFor.INSERT_DB, conn);

    return transaction;
  }
}
