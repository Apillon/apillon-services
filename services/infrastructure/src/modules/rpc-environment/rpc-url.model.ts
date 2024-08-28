import {
  AdvancedSQLModel,
  Context,
  ListRpcUrlsForEnvironmentQueryFilter,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  getQueryParams,
  presenceValidator,
  prop,
  selectAndCountQuery,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { InfrastructureErrorCode, DbTables } from '../../config/types';
export class RpcUrl extends AdvancedSQLModel {
  public readonly tableName = DbTables.RPC_URL;
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
        code: InfrastructureErrorCode.RPC_URL_NAME_NOT_PRESENT,
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
    validators: [
      {
        resolver: presenceValidator(),
        code: InfrastructureErrorCode.RPC_URL_HTTPS_URL_NOT_PRESENT,
      },
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
    validators: [
      {
        resolver: presenceValidator(),
        code: InfrastructureErrorCode.RPC_URL_WSS_URL_NOT_PRESENT,
      },
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
        code: InfrastructureErrorCode.RPC_URL_ENVIRONMENT_ID_NOT_PRESENT,
      },
    ],
  })
  environmentId: number;
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
  projectUuid: string;
  public async populateByNetworkAndEnvironment(
    network: string,
    environmentId: number,
  ) {
    this.reset();
    const data = await this.getContext().mysql.paramExecute(
      `SELECT * FROM ${this.tableName} WHERE network = @network and environmentId = @environmentId LIMIT 1`,
      {
        network,
        environmentId,
      },
    );
    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }
  public async listForEnvironment(
    filter: ListRpcUrlsForEnvironmentQueryFilter,
  ) {
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
          WHERE u.environmentId = ${filter.environmentId}`,
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
          SELECT u.*, e.projectUuid
          FROM \`${this.tableName}\` u
          LEFT JOIN \`${DbTables.RPC_ENVIRONMENT}\` e ON u.environmentId = e.id
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
