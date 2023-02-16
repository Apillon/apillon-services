import { ServiceContext } from '../../context';
import { NftsValidationException } from '../../lib/exceptions';
import { TransactionDTO } from './dtos/transaction.dto';
import { Transaction } from './models/transaction.model';

export class TransactionService {
  static async createTransaction(
    context: ServiceContext,
    params: TransactionDTO,
  ) {
    try {
      await params.validate();
    } catch (err) {
      await params.handle(err);
      if (!params.isValid()) throw new NftsValidationException(params);
    }

    const transaction: Transaction = new Transaction(params, context);
    await transaction.createTransaction();

    //Send message to SQS or execute worker directly, if Local or test environment

    return transaction;
  }
}
