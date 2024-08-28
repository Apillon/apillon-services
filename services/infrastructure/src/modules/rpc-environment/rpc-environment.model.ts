import {
  AdvancedSQLModel,
  BaseProjectQueryFilter,
  Context,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  getQueryParams,
  presenceValidator,
  prop,
  selectAndCountQuery,
} from '@apillon/lib';
import { InfrastructureErrorCode, DbTables } from '../../config/types';
import { stringParser } from '@rawmodel/parsers';
export class RpcEnvironment extends AdvancedSQLModel {
  public readonly tableName = DbTables.RPC_ENVIRONMENT;
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
        code: InfrastructureErrorCode.RPC_ENVIRONMENT_NAME_NOT_PRESENT,
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
        code: InfrastructureErrorCode.RPC_ENVIRONMENT_API_KEY_NOT_PRESENT,
      },
    ],
  })
  apiKey: string;
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE, PopulateFrom.SERVICE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: InfrastructureErrorCode.RPC_ENVIRONMENT_PROJECT_UUID_NOT_PRESENT,
      },
    ],
  })
  projectUuid: string;
  public async listForProject(filter: BaseProjectQueryFilter) {
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
      qFrom: `FROM ${DbTables.RPC_ENVIRONMENT}
        WHERE status <> ${SqlModelStatus.DELETED} and projectUuid = '${filter.project_uuid}'`,
      qFilter: `
         ORDER BY ${filters.orderStr}
         LIMIT ${filters.limit} OFFSET ${filters.offset}`,
    };
    return selectAndCountQuery(this.getContext().mysql, sqlQuery, params, 'id');
  }
}
