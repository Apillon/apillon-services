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
import { stringParser, integerParser } from '@rawmodel/parsers';
import { RpcUrl } from './rpc-url.model';
export class RpcApiKey extends UuidSqlModel {
  public readonly tableName = DbTables.RPC_API_KEY;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  /**
   * id
   */
  @prop({
    parser: { resolver: integerParser() },
    serializable: [
      SerializeFor.SERVICE,
      SerializeFor.WORKER,
      SerializeFor.LOGGER,
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
    ],
    populatable: [PopulateFrom.DB],
  })
  public id: number;

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

  // Joined fields
  @prop({
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.APILLON_API],
  })
  urls: RpcUrl[];

  public async listForProject(filter: BaseProjectQueryFilter) {
    const fieldMap = {
      id: 'id',
    };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      '',
      fieldMap,
      filter.serialize(),
    );
    const sqlQuery = {
      qSelect: `SELECT ${this.generateSelectFields()}`,
      qFrom: `FROM ${DbTables.RPC_API_KEY}
        WHERE status <> ${SqlModelStatus.DELETED} and project_uuid = '${filter.project_uuid}'
        AND (@search IS NULL OR name LIKE CONCAT('%',@search,'%'))`,
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
        AND status <> ${SqlModelStatus.DELETED}
      `,
      { user_id: userId },
    );
    return data?.length ? data[0].total : 0;
  }

  public async populateByIdWithUrls(id: number) {
    const context = this.getContext();
    const data = await context.mysql.paramExecute(
      `
      SELECT 
        k.*,
        u.id as url_id,
        u.chainName,
        u.network,
        u.httpsUrl,
        u.wssUrl,
        u.apiKeyId
      FROM \`${DbTables.RPC_API_KEY}\` k
      LEFT JOIN \`${DbTables.RPC_URL}\` u ON k.id = u.apiKeyId
      WHERE k.id = @id
    `,
      { id },
    );

    if (!data.length) {
      return this.reset();
    }

    const urls = data.map((row) =>
      new RpcUrl({}, context)
        .populate(
          {
            id: row['url_id'], // Changed from 'u.id' to 'url_id'
            chainName: row['chainName'],
            network: row['network'],
            httpsUrl: row['httpsUrl'],
            wssUrl: row['wssUrl'],
            apiKeyId: row['apiKeyId'],
          },
          PopulateFrom.DB,
        )
        .serialize(SerializeFor.APILLON_API),
    );

    const initialRow = data[0];

    return new RpcApiKey({}, context).populate(
      {
        id: initialRow['id'],
        name: initialRow['name'],
        description: initialRow['description'],
        uuid: initialRow['uuid'],
        project_uuid: initialRow['project_uuid'],
        urls,
      },
      PopulateFrom.DB,
    );
  }
}
