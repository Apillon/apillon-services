import {
  AdvancedSQLModel,
  Context,
  getQueryParams,
  PopulateFrom,
  presenceValidator,
  prop,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
  TransactionQueryFilter,
  TransactionStatus,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { DbTables, NftsErrorCode } from '../../../config/types';

export class Transaction extends AdvancedSQLModel {
  public readonly tableName = DbTables.TRANSACTION;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

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
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: NftsErrorCode.TRANSACTION_CHAIN_ID_NOT_PRESENT,
      },
    ],
  })
  public chainId: number;

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
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: NftsErrorCode.TRANSACTION_TYPE_NOT_PRESENT,
      },
    ],
  })
  public transactionType: number;

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
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [],
  })
  public refTable: string;

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
  public refId: number;

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
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    defaultValue: TransactionStatus.PENDING,
  })
  public transactionStatus: number;

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
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public transactionHash: string;

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
        WHERE transactionHash = @transactionHash;
        `,
      { transactionHash },
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    } else {
      return this.reset();
    }
  }

  public async getTransactions(
    transactionStatus: number,
  ): Promise<Transaction[]> {
    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${this.tableName}\`
      WHERE status <> ${SqlModelStatus.DELETED}
      AND transactionStatus = @transactionStatus;
      `,
      { transactionStatus },
    );

    const res: Transaction[] = [];
    if (data && data.length) {
      for (const t of data) {
        res.push(new Transaction({}, this.getContext()).populate(t));
      }
    }

    return res;
  }

  public async getTransactionsByHashes(
    hashes: string[],
  ): Promise<Transaction[]> {
    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${this.tableName}\`
      WHERE transactionHash in ('${hashes.join("','")}')`,
    );

    const res: Transaction[] = [];
    if (data && data.length) {
      for (const t of data) {
        res.push(new Transaction({}, this.getContext()).populate(t));
      }
    }

    return res;
  }

  public async getList(filter: TransactionQueryFilter) {
    // Map url query with sql fields.
    const fieldMap = {
      id: 't.id',
    };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      't',
      fieldMap,
      filter.serialize(),
    );

    const sqlQuery = {
      qSelect: `
        SELECT ${this.generateSelectFields('t', '')}, t.updateTime
        `,
      qFrom: `
        FROM \`${this.tableName}\` t
        WHERE (@refTable IS null OR refTable = @refTable) 
        AND (@refId IS NULL or refId = @refId)
        AND status <> ${SqlModelStatus.DELETED}
        AND (@transactionStatus IS null OR t.transactionStatus = @transactionStatus)
      `,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    return await selectAndCountQuery(
      this.getContext().mysql,
      sqlQuery,
      params,
      't.id',
    );
  }
}
