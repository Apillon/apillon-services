import {
  AdvancedSQLModel,
  Context,
  PoolConnection,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  presenceValidator,
  prop,
} from '@apillon/lib';
import { floatParser, integerParser } from '@rawmodel/parsers';
import { DbTables, InfrastructureErrorCode } from '../../../config/types';
export class IndexerBilling extends AdvancedSQLModel {
  public readonly tableName = DbTables.INDEXER_BILLING;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: InfrastructureErrorCode.INDEXER_BILLING_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  indexer_id: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
    ],
  })
  year: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
    ],
  })
  month: number;

  /** Amount that was already billed for this year & month*/
  @prop({
    parser: { resolver: floatParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
    ],
    defaultValue: 0,
  })
  billedAmount: number;

  /**
   * Populate the model by indexer_id, year and month and lock the row for update
   * @param indexer_id
   * @param year
   * @param month
   * @param conn
   * @returns
   */
  public async populateByIndexerYearAndMonthForUpdate(
    indexer_id: number,
    year: number,
    month: number,
    conn: PoolConnection,
  ): Promise<this> {
    if (!indexer_id || !year || !month) {
      throw new Error(
        `input parameters should not be null: ${indexer_id}, ${year}, ${month}`,
      );
    }

    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT ib.*
        FROM \`${DbTables.INDEXER_BILLING}\` ib
        JOIN \`${DbTables.INDEXER}\` i ON i.id = ib.indexer_id
        WHERE i.id = @indexer_id
        AND ib.year = @year
        AND ib.month = @month
        AND ib.status <> ${SqlModelStatus.DELETED}
        FOR UPDATE;
        `,
      { indexer_id, year, month },
      conn,
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }
}
