import {
  ChainType,
  Context,
  ContractsQueryFilter,
  getQueryParams,
  PopulateFrom,
  presenceValidator,
  prop,
  selectAndCountQuery,
  SerializeFor,
  SmartContractType,
  SqlModelStatus,
  UuidSqlModel,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { ContractsErrorCode, DbTables } from '../../../config/types';
import { ContractVersion } from './contractVersion.model';
import { ContractVersionMethod } from './contractVersionMethod.model';

export class Contract extends UuidSqlModel {
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
      SerializeFor.APILLON_API,
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
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
    ],
  })
  public contractVersion: ContractVersion;

  /***************************************************
   * Info properties
   *****************************************************/

  public async getList(
    filter: ContractsQueryFilter,
    serializationStrategy = SerializeFor.SELECT_DB,
  ) {
    const context = this.getContext();
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
  public async getContractWithLatestVersion(
    contract_uuid: string,
  ): Promise<Contract[]> {
    const contractVersion = new ContractVersion({}, this.getContext());
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
  }

  public async getContractWithLatestVersionAndMethods(
    contract_uuid: string,
  ): Promise<{ [key: string]: unknown }[]> {
    const contractVersion = new ContractVersion({}, this.getContext());
    const contractVersionMethod = new ContractVersionMethod(
      {},
      this.getContext(),
    );
    return await this.getContext().mysql.paramExecute(
      `
        SELECT ${contractVersion.generateSelectFields('cv', 'cv')},
               ${this.generateSelectFields('c', 'c')},
               ${contractVersionMethod.generateSelectFields('cvm', 'cvm')}
        FROM \`${DbTables.CONTRACT_VERSION}\` AS cv
               LEFT JOIN \`${DbTables.CONTRACT}\` AS c ON (cv.contract_id = c.id)
               LEFT JOIN \`${DbTables.CONTRACT_VERSION_METHOD}\` AS cvm
                         ON (cvm.contract_version_id = cv.id)
        WHERE c.contract_uuid = @contract_uuid
          AND c.status = ${SqlModelStatus.ACTIVE}
          AND cv.version = (SELECT MAX(cvtmp.version)
                            FROM \`${DbTables.CONTRACT_VERSION}\` cvtmp
                            WHERE cvtmp.contract_id = c.id)
        ORDER BY cv.version DESC;
      `,
      { contract_uuid },
    );
  }
}
