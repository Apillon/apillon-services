import {
  Context,
  ListRpcUrlsForApiKeyQueryFilter,
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
import { InfrastructureErrorCode, DbTables } from '../../../config/types';
export class RpcUrl extends UuidSqlModel {
  public readonly tableName = DbTables.RPC_URL;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  /**
   * id
   */
  @prop({
    parser: { resolver: integerParser() },
    serializable: [
      SerializeFor.APILLON_API,
      SerializeFor.SERVICE,
      SerializeFor.WORKER,
      SerializeFor.LOGGER,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
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
        code: InfrastructureErrorCode.RPC_URL_CHAIN_NAME_NOT_PRESENT,
      },
    ],
  })
  chainName: string;

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
        code: InfrastructureErrorCode.RPC_URL_NETWORK_NOT_PRESENT,
      },
    ],
  })
  network: string;

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
  httpsUrl: string;

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
  wssUrl: string;

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
    validators: [
      {
        resolver: presenceValidator(),
        code: InfrastructureErrorCode.RPC_URL_API_KEY_ID_NOT_PRESENT,
      },
    ],
  })
  apiKeyId: number;

  // Joined fields
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [SerializeFor.SERVICE, SerializeFor.PROFILE],
    validators: [],
  })
  project_uuid: string;

  public async populateByNetworkChainNameAndApiKey(
    network: string,
    apiKeyId: number,
    chainName: string,
  ) {
    this.reset();
    const data = await this.getContext().mysql.paramExecute(
      `SELECT * FROM ${this.tableName}
       WHERE network = @network
       AND apiKeyId = @apiKeyId
       AND chainName = @chainName
       AND status <> ${SqlModelStatus.DELETED} LIMIT 1`,
      {
        network,
        apiKeyId,
        chainName,
      },
    );
    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async listForApiKey(filter: ListRpcUrlsForApiKeyQueryFilter) {
    const fieldMap = {
      id: 'u.id',
    };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'u',
      fieldMap,
      filter.serialize(),
    );
    const sqlQuery = {
      qSelect: `SELECT ${this.generateSelectFields()}`,
      qFrom: `FROM ${DbTables.RPC_URL} u
          WHERE u.apiKeyId = ${filter.apiKeyId} AND (@search IS NULL or u.chainName LIKE CONCAT('%',@search,'%')) AND u.status <> ${SqlModelStatus.DELETED}`,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset}`,
    };
    return selectAndCountQuery(
      this.getContext().mysql,
      sqlQuery,
      params,
      'u.id',
    );
  }

  /**
   * Populates model fields by loading the document with the provided id from the database.
   * @param id Document's ID.
   * @param conn Pool connections
   * @param forUpdate Lock record for UPDATE
   * @param allStatuses Ignore record status
   *
   */
  public async populateByIdWithProject(id: number | string): Promise<this> {
    if (!id) {
      throw new Error('ID should not be null');
    }
    if (!('id' in this)) {
      throw new Error('Object does not contain id property');
    }
    this.reset();
    const data = await this.getContext().mysql.paramExecute(
      `
          SELECT u.*, e.project_uuid
          FROM \`${this.tableName}\` u
          LEFT JOIN \`${DbTables.RPC_API_KEY}\` e ON u.apiKeyId = e.id
          WHERE u.id = @id
          AND u.status <> ${SqlModelStatus.DELETED}
          `,
      { id },
    );
    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }
}
