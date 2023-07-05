import { PoolConnection, SerializeFor } from '@apillon/lib';
import { Transaction } from './models/transaction.model';
import { AuthenticationValidationException } from '../../lib/exceptions';

export class TransactionService {
  static async saveTransaction(
    transaction: Transaction,
    conn?: PoolConnection,
  ) {
    try {
      await transaction.validate();
    } catch (err) {
      await transaction.handle(err);
      if (!transaction.isValid()) {
        throw new AuthenticationValidationException(transaction);
      }
    }
    await transaction.insert(SerializeFor.INSERT_DB, conn);

    return transaction;
  }
}
