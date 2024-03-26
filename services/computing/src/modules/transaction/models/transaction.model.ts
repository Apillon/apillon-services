import {
  AdvancedSQLModel,
  ComputingTransactionQueryFilter,
  Context,
  getQueryParams,
  PopulateFrom,
  presenceValidator,
  prop,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  ComputingErrorCode,
  ComputingTransactionStatus,
  DbTables,
  TransactionType,
} from '../../../config/types';
import { ServiceContext } from '@apillon/service-lib';

export class Transaction extends AdvancedSQLModel {
  public readonly tableName = DbTables.TRANSACTION;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.WORKER,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ComputingErrorCode.FIELD_NOT_PRESENT,
      },
    ],
  })
  public walletAddress: string;

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
    defaultValue: ComputingTransactionStatus.PENDING,
  })
  public transactionStatus: ComputingTransactionStatus;

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
  public transactionStatusMessage: string;

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
    ],
    validators: [],
  })
  public nonce: string;

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
    ],
    validators: [],
    defaultValue: {},
  })
  public metadata: {
    pruntimeUrl: string;
  };

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
        WHERE transactionHash = @transactionHash;
      `,
      { transactionHash },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async getContractTransactions(
    contract_uuid: string,
    transactionStatus: ComputingTransactionStatus = null,
    transactionType: TransactionType = null,
  ): Promise<Transaction[]> {
    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT t.*
        FROM \`${this.tableName}\` as t
               JOIN ${DbTables.CONTRACT} as c ON (c.id = t.contract_id)
        WHERE t.status <> ${SqlModelStatus.DELETED}
          AND (@transactionStatus IS NULL OR
               t.transactionStatus = @transactionStatus)
          AND (@transactionType IS NULL OR t.transactionType = @transactionType)
          AND c.contract_uuid = @contract_uuid
      `,
      { transactionStatus, transactionType, contract_uuid },
    );

    return (
      data?.map((d) => new Transaction({}, this.getContext()).populate(d)) || []
    );
  }

  /**
   * Gets non executed contract transactions that are less than X hours old
   * (we ignore X hours old so we don't keep processing them if we were not able to obtain them)
   * @param clusterId
   */
  public async getContractTransactionsNotLogged(clusterId: string) {
    return (await this.getContext().mysql.paramExecute(
      `
        SELECT t.id              AS transaction_id,
               t.transaction_uuid AS transaction_uuid,
               t.transactionType AS transactionType,
               t.transactionHash AS transactionHash,
               t.nonce           AS transactionNonce,
               t.walletAddress AS walletAddress,
               c.id              AS contract_id,
               c.project_uuid    AS project_uuid,
               c.contractAddress AS contractAddress,
               c.data     AS contractData,
               t.metadata AS metadata
        FROM \`${this.tableName}\` as t
               JOIN ${DbTables.CONTRACT} as c ON (c.id = t.contract_id)
        WHERE t.status <> ${SqlModelStatus.DELETED}
          AND t.transactionStatus = @transactionStatus
          AND JSON_EXTRACT(c.data, "$.clusterId") = @clusterId
          AND (
          (t.transactionType = @transactionType AND
           c.contractAddress IS NOT NULL)
            OR t.transactionType
          != @transactionType)
          AND t.createTime
            > NOW() - INTERVAL 2 HOUR
      `,
      {
        clusterId,
        transactionType: TransactionType.DEPLOY_CONTRACT,
        transactionStatus: ComputingTransactionStatus.CONFIRMED,
      },
    )) as {
      project_uuid: string;
      transaction_id: number;
      transaction_uuid: string;
      transactionType: TransactionType;
      transactionHash: string;
      transactionNonce: string;
      walletAddress: string;
      contract_id: number;
      contractAddress: string;
      contractData: { clusterId: string };
      metadata: { pruntimeUrl: string };
    }[];
  }

  public async getList(
    context: ServiceContext,
    filter: ComputingTransactionQueryFilter,
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
        JOIN ${DbTables.CONTRACT} AS c ON (c.id = t.contract_id)
        WHERE t.status <> ${SqlModelStatus.DELETED}
        AND (@contract_uuid IS null OR c.contract_uuid = @contract_uuid)
        AND (@transactionStatus IS null OR t.transactionStatus = @transactionStatus)
        AND (@transactionType IS null OR t.transactionType = @transactionType)
        AND (@search IS null OR t.transactionHash LIKE CONCAT('%', @search, '%'))
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
}
