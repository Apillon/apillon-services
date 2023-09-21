import {
  CreditTransactionQueryFilter,
  PopulateFrom,
  ProjectAccessModel,
  SerializeFor,
  SqlModelStatus,
  getQueryParams,
  presenceValidator,
  prop,
  selectAndCountQuery,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { v4 as uuidV4 } from 'uuid';
import { ConfigErrorCode, DbTables } from '../../../config/types';

export class CreditTransaction extends ProjectAccessModel {
  public readonly tableName = DbTables.CREDIT_TRANSACTION;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.LOGGER,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ConfigErrorCode.CREDIT_TRANSACTION_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
    fakeValue: () => uuidV4(),
  })
  public project_uuid: string;

  /**
   * current balance
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.ADMIN, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.LOGGER,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ConfigErrorCode.CREDIT_TRANSACTION_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public credit_id: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.ADMIN, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.LOGGER,
    ],
  })
  public product_id: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.ADMIN, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.LOGGER,
    ],
  })
  public direction: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.ADMIN, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.LOGGER,
    ],
  })
  public amount: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.LOGGER,
    ],
  })
  public referenceTable: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.LOGGER,
    ],
  })
  public referenceId: string;

  /**
   * Populate credit transaction which was not yet refunded, by reference
   * @param referenceTable
   * @param referenceId
   * @returns
   */
  public async populateRefundableTransaction(
    referenceTable: string,
    referenceId: string,
  ): Promise<this> {
    if (!referenceTable || !referenceId) {
      throw new Error(
        `params should not be null: ${referenceTable}, ${referenceId}`,
      );
    }

    const data = await this.getContext().mysql.paramExecute(
      `
          SELECT *
          FROM \`${this.tableName}\` ct
          WHERE ct.referenceTable = @referenceTable 
          AND ct.referenceId = @referenceId
          AND ct.direction = 1
          AND NOT EXISTS (
            SELECT 1 FROM \`${this.tableName}\` ct2
            WHERE ct2.referenceTable = @referenceTable 
            AND ct2.referenceId = @referenceId
            AND ct2.direction = 2
          )
          AND ct.status <> ${SqlModelStatus.DELETED};
        `,
      { referenceTable, referenceId },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async populateByReference(
    referenceTable: string,
    referenceId: string,
  ): Promise<this> {
    if (!referenceTable || !referenceId) {
      throw new Error(
        `params should not be null: ${referenceTable}, ${referenceId}`,
      );
    }

    const data = await this.getContext().mysql.paramExecute(
      `
          SELECT *
          FROM \`${this.tableName}\` ct
          WHERE ct.referenceTable = @referenceTable 
          AND ct.referenceId = @referenceId
          AND ct.status <> ${SqlModelStatus.DELETED};
        `,
      { referenceTable, referenceId },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async getList(
    filter: CreditTransactionQueryFilter,
    serializationStrategy = SerializeFor.PROFILE,
  ) {
    const context = this.getContext();
    this.canAccess(context);
    // Map url query with sql fields.
    const fieldMap = {
      id: 'ct.id',
    };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'ct',
      fieldMap,
      filter.serialize(),
    );

    const sqlQuery = {
      qSelect: `
        SELECT ${this.generateSelectFields('ct', '', serializationStrategy)}
        `,
      qFrom: `
        FROM \`${this.tableName}\` ct
        WHERE ct.project_uuid = @project_uuid
        AND (@search IS null OR ct.referenceTable LIKE CONCAT('%', @search, '%'))
        AND ct.status <> ${SqlModelStatus.DELETED}
      `,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    return await selectAndCountQuery(context.mysql, sqlQuery, params, 'ct.id');
  }
}
