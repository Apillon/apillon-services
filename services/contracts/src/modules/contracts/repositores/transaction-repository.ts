import { ServiceContext } from '@apillon/service-lib';
import { Transaction } from '../models/transaction.model';
import {
  ContractTransactionQueryFilter,
  PoolConnection,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { ContractsModelValidationException } from '../../../lib/exceptions';
import { DbTables } from '../../../config/types';

export class TransactionRepository {
  private readonly context: ServiceContext;

  constructor(context: ServiceContext) {
    this.context = context;
  }

  public async populateByTransactionHash(
    transactionHash: string,
  ): Promise<Transaction> {
    if (!transactionHash) {
      throw new Error('transactionHash should not be null!');
    }
    const data = await this.context.mysql.paramExecute(
      `
        SELECT *
        FROM \`${DbTables.TRANSACTION}\`
        WHERE transactionHash = @transactionHash;
      `,
      { transactionHash },
    );
    const transaction = new Transaction({}, this.context);

    return data?.length
      ? transaction.populate(data[0], PopulateFrom.DB)
      : transaction.reset();
  }

  /**
   * Get total transaction count within a project
   * @param project_uuid
   * @returns count of transactions
   */
  public async getTransactionCountOnProject(
    project_uuid: string,
  ): Promise<number> {
    if (!project_uuid) {
      throw new Error('project_uuid should not be null');
    }

    const data = await this.context.mysql.paramExecute(
      `
        SELECT COUNT(*) as txCount
        FROM \`${DbTables.TRANSACTION}\` t
               INNER JOIN \`${DbTables.CONTRACT_DEPLOY}\` c ON t.refId = c.contract_uuid
        WHERE c.project_uuid = @project_uuid
          AND t.status <> ${SqlModelStatus.DELETED};
      `,
      { project_uuid },
    );

    return data?.length ? data[0].txCount : 0;
  }

  async createTransaction(transaction: Transaction, conn?: PoolConnection) {
    await transaction.validateOrThrow(ContractsModelValidationException);

    await transaction.insert(SerializeFor.INSERT_DB, conn);

    return transaction;
  }

  async getList(query: ContractTransactionQueryFilter) {
    return await new Transaction({}, this.context).getList(query);
  }
}
