import {
  ChainType,
  DeployedSimpletsQueryFilterDto,
  enumInclusionValidator,
  EvmChain,
  getQueryParams,
  PopulateFrom,
  presenceValidator,
  prop,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
  UuidSqlModel,
} from '@apillon/lib';
import {
  DbTables,
  ResourceStatus,
  SimpletsErrorCode,
} from '../../../config/types';
import { integerParser, stringParser } from '@rawmodel/parsers';

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
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
  })
  public description: string;

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
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: ResourceStatus.CREATED,
  })
  public backendStatus: ResourceStatus;

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
  public backendUrl: string;
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
    defaultValue: ResourceStatus.CREATED,
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
        resolver: enumInclusionValidator(EvmChain, false),
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
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: ResourceStatus.CREATED,
  })
  public frontendStatus: ResourceStatus;

  //endregion

  /***************************************************
   * Queries
   *****************************************************/

  public override async populateByUUID(uuid: string): Promise<this> {
    return super.populateByUUID(uuid, 'simplet_uuid');
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
        AND (@resourceStatus IS null OR c.resourceStatus = @resourceStatus)
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
}
