import { PoolConnection, SerializeFor } from '@apillon/lib';
import { ComputingModelValidationException } from '../../lib/exceptions';
import { Transaction } from './models/transaction.model';

export class TransactionService {
  static async saveTransaction(
    transaction: Transaction,
    conn?: PoolConnection,
  ) {
    await transaction.validateOrThrow(ComputingModelValidationException);
    await transaction.insert(SerializeFor.INSERT_DB, conn);

    return transaction;
  }
}
