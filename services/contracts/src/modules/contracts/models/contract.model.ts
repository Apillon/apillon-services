import {
  CacheKeyPrefix,
  CacheKeyTTL,
  ChainType,
  Context,
  ContractsQueryFilter,
  getQueryParams,
  PopulateFrom,
  presenceValidator,
  ProjectAccessModel,
  prop,
  runCachedFunction,
  selectAndCountQuery,
  SerializeFor,
  SmartContractType,
  SqlModelStatus,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { ContractsErrorCode, DbTables } from '../../../config/types';
import { ContractVersion } from './contractVersion.model';

export class Contract extends ProjectAccessModel {
  public readonly tableName = DbTables.CONTRACT;

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
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.WORKER,
      SerializeFor.LOGGER,
      SerializeFor.SERVICE,
    ],
  })
  public id: number;

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
  public contractType: SmartContractType;

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
    parser: { resolver: ContractVersion },
    populatable: [PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.ADMIN, SerializeFor.SERVICE],
  })
  public contractVersion: ContractVersion;

  /***************************************************
   * Info properties
   *****************************************************/

  public async getList(filter: ContractsQueryFilter) {
    const context = this.getContext();
    const serializationStrategy = context.getSerializationStrategy();
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
      qSelect: `SELECT ${selectFields}`,
      qFrom: `
        FROM \`${DbTables.CONTRACT}\` c
        WHERE (@search IS null OR c.name LIKE CONCAT('%', @search, '%'))
        AND (@chainType IS null OR c.chainType = @chainType)
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
        new Contract({}, context)
          .populate(contract, PopulateFrom.DB)
          .serialize(serializationStrategy),
      ),
    };
  }

  public override async populateByUUID(contract_uuid: string): Promise<this> {
    return super.populateByUUID(contract_uuid, 'contract_uuid');
  }

  /**
   * Returns contract version
   *
   * @param contract_uuid - id of contract to get.
   * @returns Promise<ContractVersion>
   * @throws Error - if contract version has not been found for given params
   */
  public async getLatestContractVersion(
    contract_uuid: string,
  ): Promise<Contract> {
    const contractVersion = new ContractVersion({}, this.getContext());
    const data = await runCachedFunction(
      `${CacheKeyPrefix.CONTRACT_UUID}:${[contract_uuid].join(':')}`,
      async () => {
        return await this.getContext().mysql.paramExecute(
          `
            SELECT ${contractVersion.generateSelectFields('cv', 'cv')},
                   ${this.generateSelectFields('c', 'c')}
            FROM \`${DbTables.CONTRACT_VERSION}\` AS cv
                   LEFT JOIN \`${DbTables.CONTRACT}\` AS c ON (cv.contract_id = c.id)
            WHERE c.contract_uuid = @contract_uuid
              AND cv.status = ${SqlModelStatus.ACTIVE}
            ORDER BY cv.version DESC
            LIMIT 1
            ;
          `,
          { contract_uuid },
        );
      },
      CacheKeyTTL.EXTRA_LONG,
    );
    let contractVersionData = {};
    let contractData = {};
    for (const key in data[0]) {
      if (key.startsWith('cv__')) {
        contractVersionData[key.replace('cv__', '')] = data[0][key];
      } else {
        contractData[key.replace('c__', '')] = data[0][key];
      }
    }
    contractVersion.populate(contractVersionData);
    if (!contractVersion.exists()) {
      throw new Error(`Contract version not found`);
    }
    const contract = new Contract(contractData, this.getContext());
    if (!contract.exists()) {
      throw new Error(`Contract not found`);
    }
    contract.contractVersion = contractVersion;

    return contract;
  }
}
