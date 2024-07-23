import {
  AdvancedSQLModel,
  Chain,
  Context,
  ContractTransactionQueryFilter,
  getQueryParams,
  PoolConnection,
  PopulateFrom,
  presenceValidator,
  prop,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
  TransactionStatus,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { ContractsErrorCode, DbTables } from '../../../config/types';

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
        code: ContractsErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public chain: Chain;

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
        code: ContractsErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public transactionType: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.INSERT_DB],
    validators: [],
  })
  public refTable: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.INSERT_DB],
  })
  public refId: string;

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
  public transactionStatus: TransactionStatus;

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

  public async getList(filter: ContractTransactionQueryFilter) {
    const context = this.getContext();
    const serializationStrategy = context.getSerializationStrategy();
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

  public async getTransactionByChainAndHash(
    chain: Chain,
    transactionHash: string,
    conn?: PoolConnection,
  ) {
    const data = await this.getContext().mysql.paramExecute(
      `SELECT *
       FROM \`${DbTables.TRANSACTION}\`
       WHERE transactionHash = @transactionHash
         AND chain = @chain`,
      {
        chain,
        transactionHash,
      },
      conn,
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }
}
