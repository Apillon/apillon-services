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
import { InfrastructureErrorCode, DbTables } from '../../config/types';
import { stringParser } from '@rawmodel/parsers';
export class RpcApiKey extends UuidSqlModel {
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
        code: InfrastructureErrorCode.RPC_API_KEY_NAME_NOT_PRESENT,
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
        code: InfrastructureErrorCode.RPC_API_KEY_API_KEY_NOT_PRESENT,
      },
    ],
  })
  uuid: string;

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
        code: InfrastructureErrorCode.RPC_API_KEY_PROJECT_UUID_NOT_PRESENT,
      },
    ],
  })
  project_uuid: string;

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
      qFrom: `FROM ${DbTables.RPC_API_KEY}
        WHERE status <> ${SqlModelStatus.DELETED} and project_uuid = '${filter.project_uuid}'`,
      qFilter: `
         ORDER BY ${filters.orderStr}
         LIMIT ${filters.limit} OFFSET ${filters.offset}`,
    };
    return selectAndCountQuery(this.getContext().mysql, sqlQuery, params, 'id');
  }

  public async getNumberOfKeysPerUser(userId: number): Promise<number | 0> {
    const data = await this.db().paramExecute(
      `
        SELECT COUNT(id) as total
        FROM \`${DbTables.RPC_API_KEY}\`
        WHERE createUser = @user_id
      `,
      { user_id: userId },
    );
    return data?.length ? data[0].total : 0;
  }
}
