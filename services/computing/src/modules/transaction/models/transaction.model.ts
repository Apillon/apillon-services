import {
  AdvancedSQLModel,
  Context,
  PopulateFrom,
  presenceValidator,
  prop,
  SerializeFor,
  SqlModelStatus,
  TransactionStatus,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  ComputingErrorCode,
  DbTables,
  TransactionType,
} from '../../../config/types';

export class Transaction extends AdvancedSQLModel {
  public readonly tableName = DbTables.TRANSACTION;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
  })
  public contract_id?: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ComputingErrorCode.TRANSACTION_TYPE_NOT_PRESENT,
      },
    ],
  })
  public transactionType: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    defaultValue: TransactionStatus.PENDING,
  })
  public transactionStatus: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
  })
  public transactionExecutedSuccessfully: boolean;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public transactionHash: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public nonce: string;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  public async populateByTransactionHash(
    transactionHash: string,
  ): Promise<Transaction> {
    if (!transactionHash) {
      throw new Error('transactionHash should not be null!');
    }
    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT *
        FROM \`${this.tableName}\`
        WHERE contract_id IS NOT NULL AND transactionHash = @transactionHash;
      `,
      { transactionHash },
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    } else {
      return this.reset();
    }
  }

  public async getContractTransactions(
    contract_uuid: string,
    transactionStatus: TransactionStatus = null,
    transactionType: TransactionType = null,
  ): Promise<Transaction[]> {
    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT t.*
        FROM \`${this.tableName}\` as t
               JOIN contract as c ON (c.id = t.contract_id)
        WHERE t.status <> ${SqlModelStatus.DELETED}
          AND (@transactionStatus IS NULL OR
               t.transactionStatus = @transactionStatus)
          AND (@transactionType IS NULL OR t.transactionType = @transactionType)
          AND c.contract_uuid = @contract_uuid
      `,
      { transactionStatus, transactionType, contract_uuid },
    );

    const res: Transaction[] = [];
    if (data && data.length) {
      for (const t of data) {
        res.push(new Transaction({}, this.getContext()).populate(t));
      }
    }

    return res;
  }

  public async getNonExecutedTransactionsAndContracts(clusterId: string) {
    return (await this.getContext().mysql.paramExecute(
      `
        SELECT t.id AS transaction_id,
               t.transactionType AS transactionType,
               t.transactionHash AS transactionHash,
               t.nonce AS transactionNonce,
               c.id               AS contract_id,
               c.project_uuid     AS project_uuid,
               c.contractAddress  AS contractAddress,
               c.data             AS contractData
        FROM \`${this.tableName}\` as t
               JOIN contract as c ON (c.id = t.contract_id)
        WHERE t.status <> ${SqlModelStatus.DELETED}
          AND t.transactionExecutedSuccessfully IS NULL
          AND t.transactionStatus = @transactionStatus
          AND JSON_EXTRACT(c.data, "$.clusterId") = @clusterId
      `,
      { clusterId, transactionStatus: TransactionStatus.CONFIRMED },
    )) as {
      project_uuid: string;
      transaction_id: number;
      transactionType: TransactionType;
      transactionHash: string;
      transactionNonce: string;
      contract_id: number;
      contractAddress: string;
      contractData: { clusterId: string };
    }[];
  }
}
