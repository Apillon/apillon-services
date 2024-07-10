import {
  ChainType,
  Context,
  DeployedContractsQueryFilter,
  EvmChain,
  getQueryParams,
  PopulateFrom,
  presenceValidator,
  ProjectAccessModel,
  prop,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  ContractsErrorCode,
  ContractStatus,
  DbTables,
} from '../../../config/types';
import { ContractVersion } from './contractVersion.model';
import { ContractVersionMethod } from './contractVersionMethod.model';

export class ContractDeploy extends ProjectAccessModel {
  public readonly tableName = DbTables.CONTRACT_DEPLOY;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ContractsErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public contract_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ContractsErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public project_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ContractsErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public name: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
  })
  public description: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public chainType: ChainType;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public chain: EvmChain;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public version_id: number;

  // TODO: not inserted
  @prop({
    parser: { array: true },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      // {
      //   resolver: presenceValidator(),
      //   code: ValidatorErrorCode.DATA_NOT_PRESENT,
      // },
    ],
  })
  public constructorArguments: any[];

  // @prop({
  //   parser: { resolver: stringParser() },
  //   populatable: [
  //     PopulateFrom.DB,
  //     PopulateFrom.SERVICE,
  //     PopulateFrom.ADMIN,
  //     PopulateFrom.PROFILE,
  //   ],
  //   serializable: [
  //     SerializeFor.INSERT_DB,
  //     SerializeFor.UPDATE_DB,
  //     SerializeFor.ADMIN,
  //     SerializeFor.SERVICE,
  //     SerializeFor.APILLON_API,
  //     SerializeFor.PROFILE,
  //   ],
  //   validators: [
  //     // {
  //     //   resolver: presenceValidator(),
  //     //   code: ValidatorErrorCode.DATA_NOT_PRESENT,
  //     // },
  //   ],
  // })
  // public custom_bytecode: string;
  //
  // @prop({
  //   parser: { resolver: Abi.parse },
  //   populatable: [
  //     PopulateFrom.DB,
  //     PopulateFrom.SERVICE,
  //     PopulateFrom.ADMIN,
  //     PopulateFrom.PROFILE,
  //   ],
  //   serializable: [
  //     SerializeFor.INSERT_DB,
  //     SerializeFor.UPDATE_DB,
  //     SerializeFor.ADMIN,
  //     SerializeFor.SERVICE,
  //     SerializeFor.APILLON_API,
  //     SerializeFor.PROFILE,
  //   ],
  //   validators: [
  //     // {
  //     //   resolver: presenceValidator(),
  //     //   code: ValidatorErrorCode.DATA_NOT_PRESENT,
  //     // },
  //   ],
  // })
  // public custom_abi: unknown[];

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    defaultValue: ContractStatus.CREATED,
  })
  public contractStatus: ContractStatus;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
  })
  public contractAddress: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [],
  })
  public deployerAddress: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.PROFILE,
    ],
  })
  public transactionHash: string;

  @prop({
    parser: { resolver: ContractVersion },
    populatable: [PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
  })
  public contractVersion: ContractVersion;

  /***************************************************
   * Info properties
   *****************************************************/

  public async getDeployedList(
    filter: DeployedContractsQueryFilter,
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
        SELECT ${selectFields}
        `,
      qFrom: `
        FROM \`${DbTables.CONTRACT_DEPLOY}\` c
        WHERE c.project_uuid = IFNULL(@project_uuid, c.project_uuid)
        AND (@search IS null OR c.name LIKE CONCAT('%', @search, '%') OR c.contract_uuid = @search)
        AND (@chainType IS null OR c.chainType = @chainType)
        AND (@contractStatus IS null OR c.contractStatus = @contractStatus)
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

    const contractsResult = await selectAndCountQuery(
      context.mysql,
      sqlQuery,
      params,
      'c.id',
    );

    return {
      ...contractsResult,
      items: contractsResult.items.map((contract) =>
        new ContractDeploy({}, context)
          .populate(contract, PopulateFrom.DB)
          .serialize(serializationStrategy),
      ),
    };
  }

  public override async populateByUUID(contract_uuid: string): Promise<this> {
    return super.populateByUUID(contract_uuid, 'contract_uuid');
  }

  canCallMethod(methodName: string): boolean {
    if (!this.contractVersion.methods || !this.contractVersion.methods) {
      throw new Error('contractVersion.methods not loaded');
    }
    return !!this.contractVersion.methods.find(
      (method) => method.name === methodName && !!method.onlyOwner,
    );
  }

  public async getContractDeployWithVersionAndMethods(
    contract_deploy_uuid: string,
  ): Promise<{ [key: string]: unknown }[]> {
    const contractVersion = new ContractVersion({}, this.getContext());
    const contractVersionMethod = new ContractVersionMethod(
      {},
      this.getContext(),
    );
    const query = `
      SELECT ${contractVersion.generateSelectFields('cv', 'cv')},
             ${this.generateSelectFields('c', 'c')},
             ${contractVersionMethod.generateSelectFields('cvm', 'cvm')}
      FROM \`${DbTables.CONTRACT_DEPLOY}\` AS c
             LEFT JOIN \`${DbTables.CONTRACT_VERSION}\` AS cv ON (cv.id = c.version_id)
             LEFT JOIN \`${DbTables.CONTRACT_VERSION_METHOD}\` AS cvm
                       ON (cvm.contract_version_id = cv.id)
      WHERE c.contract_uuid = @contract_deploy_uuid
        AND c.status = ${SqlModelStatus.ACTIVE};
    `;
    return await this.getContext().mysql.paramExecute(query, {
      contract_deploy_uuid,
    });
  }
}
