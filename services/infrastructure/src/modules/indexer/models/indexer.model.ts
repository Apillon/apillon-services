import {
  AdvancedSQLModel,
  BaseProjectQueryFilter,
  Context,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  UuidSqlModel,
  getQueryParams,
  presenceValidator,
  prop,
  selectAndCountQuery,
} from '@apillon/lib';
import { InfrastructureErrorCode, DbTables } from '../../../config/types';
import { stringParser } from '@rawmodel/parsers';
export class Indexer extends UuidSqlModel {
  public readonly tableName = DbTables.RPC_API_KEY;

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

  public async getList(filter: BaseProjectQueryFilter) {
    const fieldMap = {
      id: 'id',
    };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'w',
      fieldMap,
      filter.serialize(),
    );
    const sqlQuery = {
      qSelect: `SELECT ${this.generateSelectFields()}`,
      qFrom: `
        FROM ${DbTables.INDEXER} i
        WHERE i.status <> ${SqlModelStatus.DELETED} 
        AND project_uuid = '${filter.project_uuid}'
        AND (@search IS null OR i.name LIKE CONCAT('%', @search, '%'))`,
      qFilter: `
         ORDER BY ${filters.orderStr}
         LIMIT ${filters.limit} OFFSET ${filters.offset}`,
    };
    return selectAndCountQuery(this.getContext().mysql, sqlQuery, params, 'id');
  }
}
