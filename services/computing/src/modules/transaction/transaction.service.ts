import { PoolConnection, SerializeFor } from '@apillon/lib';
import { ComputingValidationException } from '../../lib/exceptions';
import { Transaction } from './models/transaction.model';

export class TransactionService {
  static async saveTransaction(
    transaction: Transaction,
    conn?: PoolConnection,
  ) {
    await transaction.validateOrThrow(ComputingValidationException);
    await transaction.insert(SerializeFor.INSERT_DB, conn);

    return transaction;
  }
}
