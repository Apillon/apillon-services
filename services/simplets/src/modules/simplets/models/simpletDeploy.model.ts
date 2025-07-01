import { booleanParser, integerParser, stringParser } from '@rawmodel/parsers';
import {
  ChainType,
  DeployedSimpletsQueryFilterDto,
  enumInclusionValidator,
  EvmChain,
  getQueryParams,
  PopulateFrom,
  presenceValidator,
  prop,
  ResourceStatus,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
  UuidSqlModel,
} from '@apillon/lib';
import { DbTables, SimpletsErrorCode } from '../../../config/types';

export class SimpletDeploy extends UuidSqlModel {
  public readonly tableName = DbTables.SIMPLET_DEPLOY;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: SimpletsErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public project_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: SimpletsErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public simpletDeploy_uuid: string;

  /**
   * Simplet that has been used as a template to create this deploy.
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: SimpletsErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public simplet_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: SimpletsErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public name: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
  })
  public description: string;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public trialExpired: boolean;

  //region BACKEND
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
  })
  public backend_uuid: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: ResourceStatus.REQUESTED,
  })
  public backendStatus: ResourceStatus;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
  })
  public backendUrl: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.INSERT_DB],
  })
  public backendVariables: string;
  //endregion

  //region CONTRACT
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
  })
  public contract_uuid: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: ResourceStatus.REQUESTED,
  })
  public contractStatus: ResourceStatus;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: enumInclusionValidator(EvmChain, true),
        code: SimpletsErrorCode.DATA_NOT_VALID,
      },
    ],
  })
  public contractChain: EvmChain;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.PROFILE,
    ],
  })
  public contractChainType: ChainType;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.PROFILE,
    ],
  })
  public contractAddress: string;

  //endregion

  //region EMBEDDED WALLET

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.PROFILE,
    ],
  })
  public walletIntegration_uuid: string;

  //endregion

  //region FRONTEND

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.PROFILE,
    ],
  })
  public frontend_uuid: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: ResourceStatus.REQUESTED,
  })
  public frontendStatus: ResourceStatus;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.INSERT_DB],
  })
  public frontendVariables: string;

  //endregion

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.INSERT_DB],
  })
  public apillonApiKey: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.INSERT_DB],
  })
  public apillonApiSecret: string;

  /***************************************************
   * Queries
   *****************************************************/

  public override async populateByUUID(uuid: string): Promise<this> {
    return super.populateByUUID(uuid, 'simpletDeploy_uuid');
  }

  public async getList(
    filter: DeployedSimpletsQueryFilterDto,
    serializationStrategy = SerializeFor.SELECT_DB,
  ) {
    const context = this.getContext();
    this.canAccess(context);
    // Map url query with sql fields.
    const fieldMap = {
      id: 'c.id',
    };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'c',
      fieldMap,
      filter.serialize(),
    );

    const selectFields = this.generateSelectFields(
      'c',
      '',
      serializationStrategy,
    );
    const sqlQuery = {
      qSelect: `
        SELECT
  ${selectFields}
        `,
      qFrom: `
        FROM \`${DbTables.SIMPLET_DEPLOY}\` c
        WHERE c.project_uuid = IFNULL(@project_uuid, c.project_uuid)
        AND (@search IS null OR c.name LIKE CONCAT('%', @search, '%'))
        AND (
            (@backendStatus IS null OR c.backendStatus = @backendStatus)
            OR (@frontendStatus IS null OR c.frontendStatus = @backendStatus)
            OR (@contractStatus IS null OR c.contractStatus = @backendStatus)
        )
        AND
            (
                (@status IS null AND c.status NOT IN (${SqlModelStatus.DELETED}, ${SqlModelStatus.ARCHIVED}))
                OR
                (c.status = @status)
            )
      `,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    return await selectAndCountQuery(context.mysql, sqlQuery, params, 'c.id');
  }

  public async getActiveDeployedLongerThanDays(
    days: number,
  ): Promise<SimpletDeploy[]> {
    const selectFields = this.generateSelectFields();
    const sqlQuery = `
      SELECT ${selectFields}
      FROM \`${DbTables.SIMPLET_DEPLOY}\`
      WHERE trialExpired = false
        AND status = ${SqlModelStatus.ACTIVE}
        AND createTime <= NOW() - INTERVAL ${days} DAY
    `;

    const data = await this.getContext().mysql.paramExecute(sqlQuery);

    return data
      ? data.map((simpletData) =>
          new SimpletDeploy({}, this.getContext()).populate(
            simpletData,
            PopulateFrom.DB,
          ),
        )
      : [];
  }
}
