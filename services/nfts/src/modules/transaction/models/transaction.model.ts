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
import {
  DbTables,
  NftsErrorCode,
  TransactionType,
} from '../../../config/types';
import { ServiceContext } from '@apillon/service-lib';

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
      SerializeFor.APILLON_API,
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
      SerializeFor.APILLON_API,
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
    serializable: [SerializeFor.INSERT_DB, SerializeFor.SERVICE],
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
    serializable: [SerializeFor.INSERT_DB, SerializeFor.SERVICE],
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
      SerializeFor.APILLON_API,
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
      SerializeFor.APILLON_API,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public transactionHash: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.INSERT_DB],
  })
  public transaction_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.INSERT_DB],
  })
  public callMethod: string;

  @prop({
    setter(value: unknown[]) {
      return typeof value === 'object' ? JSON.stringify(value) : value;
    },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.INSERT_DB],
  })
  public callArguments: unknown[];

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

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async getCollectionTransactions(
    collection_uuid: string,
    transactionStatus: TransactionStatus = null,
    transactionType: TransactionType = null,
  ): Promise<Transaction[]> {
    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT t.*
        FROM \`${this.tableName}\` as t
               JOIN collection as c ON (c.id = t.refId)
        WHERE t.refTable = 'collection'
          AND t.status <> ${SqlModelStatus.DELETED}
          AND (@transactionStatus IS NULL OR
               t.transactionStatus = @transactionStatus)
          AND (@transactionType IS NULL OR t.transactionType = @transactionType)
          AND c.collection_uuid = @collection_uuid
      `,
      { transactionStatus, transactionType, collection_uuid },
    );

    const res: Transaction[] = [];
    if (data?.length) {
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

    return (
      data?.map((d) => new Transaction({}, this.getContext()).populate(d)) || []
    );
  }

  public async getList(
    context: ServiceContext,
    filter: TransactionQueryFilter,
    serializationStrategy: SerializeFor = SerializeFor.PROFILE,
  ) {
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

    const selectFields = this.generateSelectFields(
      't',
      '',
      serializationStrategy,
    );
    const sqlQuery = {
      qSelect: `
        SELECT ${selectFields}
        `,
      qFrom: `
        FROM \`${this.tableName}\` t
        WHERE (@refTable IS null OR refTable = @refTable)
        AND (@refId IS NULL or refId = @refId)
        AND status <> ${SqlModelStatus.DELETED}
        AND (@transactionStatus IS null OR t.transactionStatus = @transactionStatus)
        AND (@transactionType IS null OR t.transactionType = @transactionType)
        AND (@search IS null OR transactionHash LIKE CONCAT('%', @search, '%'))
      `,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    const transactionsResult = await selectAndCountQuery(
      this.getContext().mysql,
      sqlQuery,
      params,
      't.id',
    );

    return {
      ...transactionsResult,
      items: transactionsResult.items.map((transaction) =>
        new Transaction({}, context)
          .populate(transaction, PopulateFrom.DB)
          .serialize(serializationStrategy),
      ),
    };
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

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT COUNT(*) as txCount
      FROM \`${DbTables.TRANSACTION}\` t
      INNER JOIN \`${DbTables.COLLECTION}\` c ON t.refId = c.id
      WHERE c.project_uuid = @project_uuid
      AND t.status <> ${SqlModelStatus.DELETED};
      `,
      { project_uuid },
    );

    return data?.length ? data[0].txCount : 0;
  }
}
