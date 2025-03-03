import {
  BaseProjectQueryFilter,
  Context,
  ErrorCode,
  PoolConnection,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  UuidSqlModel,
  getQueryParams,
  presenceValidator,
  prop,
  selectAndCountQuery,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { DbTables, InfrastructureErrorCode } from '../../../config/types';
import { InfrastructureCodeException } from '../../../lib/exceptions';
export class Indexer extends UuidSqlModel {
  public readonly tableName = DbTables.INDEXER;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  @prop({
    parser: { resolver: stringParser() },
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
    validators: [
      {
        resolver: presenceValidator(),
        code: InfrastructureErrorCode.INDEXER_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  indexer_uuid: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.LOGGER,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ErrorCode.STATUS_NOT_PRESENT,
      },
    ],
    defaultValue: SqlModelStatus.ACTIVE,
    fakeValue() {
      return SqlModelStatus.ACTIVE;
    },
  })
  public status: number;

  /** SquidId is used as a identifier for squid in sqd API */
  @prop({
    parser: { resolver: integerParser() },
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
  })
  squidId: number;

  /** Reference is used as a identifier for squid in sqd API */
  @prop({
    parser: { resolver: stringParser() },
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
  })
  squidReference: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE, PopulateFrom.SERVICE],
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
        code: InfrastructureErrorCode.INDEXER_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  project_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
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
    validators: [
      {
        resolver: presenceValidator(),
        code: InfrastructureErrorCode.INDEXER_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  name: string;

  @prop({
    parser: { resolver: stringParser() },
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
  })
  description: string | null;

  /** SQD id of last deployment for this indexer */
  @prop({
    parser: { resolver: integerParser() },
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
  })
  lastDeploymentId: number;

  public override populateByUUID(
    uuid: string,
    uuid_property?: string,
    conn?: PoolConnection,
  ): Promise<this> {
    return super.populateByUUID(uuid, uuid_property || 'indexer_uuid', conn);
  }

  public async populateByUUIDAndCheckAccess(uuid: string): Promise<this> {
    const indexer = await super.populateByUUID(uuid, 'indexer_uuid');

    if (!indexer.exists()) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.INDEXER_NOT_FOUND,
        status: 404,
      });
    }

    await indexer.canAccess(this.getContext());

    return indexer;
  }

  public async populateBySquidId(
    squidId: number,
    conn?: PoolConnection,
  ): Promise<this> {
    if (!squidId) {
      throw new Error(`squidId should not be null!`);
    }

    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT *
        FROM \`${DbTables.INDEXER}\`
        WHERE squidId = @squidId
        AND status NOT IN (${SqlModelStatus.DELETED}, ${SqlModelStatus.INACTIVE});
      `,
      { squidId },
      conn,
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async getIndexers(
    status = SqlModelStatus.ACTIVE,
    conn?: PoolConnection,
  ): Promise<Indexer[]> {
    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT *
        FROM \`${DbTables.INDEXER}\`
        WHERE @status = status;
      `,
      { status },
      conn,
    );

    return data.map((x) => new Indexer({}, this.getContext()).populate(x));
  }

  public async getList(filter: BaseProjectQueryFilter) {
    const fieldMap = {
      id: 'id',
    };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'i',
      fieldMap,
      filter.serialize(),
    );
    const sqlQuery = {
      qSelect: `SELECT ${this.generateSelectFields()}`,
      qFrom: `
        FROM ${DbTables.INDEXER} i
        WHERE i.status <> ${SqlModelStatus.DELETED} 
        AND project_uuid = @project_uuid
        AND (@search IS null OR i.name LIKE CONCAT('%', @search, '%'))`,
      qFilter: `
         ORDER BY ${filters.orderStr}
         LIMIT ${filters.limit} OFFSET ${filters.offset}`,
    };
    return selectAndCountQuery(this.getContext().mysql, sqlQuery, params, 'id');
  }
}
