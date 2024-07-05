import {
  AdvancedSQLModel,
  CacheKeyPrefix,
  CacheKeyTTL,
  Context,
  PopulateFrom,
  presenceValidator,
  prop,
  runCachedFunction,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { ContractsErrorCode, DbTables } from '../../../config/types';
import { Abi } from 'abitype/zod';

export class ContractVersion extends AdvancedSQLModel {
  public readonly tableName = DbTables.CONTRACT_VERSION;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.INSERT_DB, SerializeFor.SELECT_DB],
    validators: [
      {
        resolver: presenceValidator(),
        code: ContractsErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public contract_id: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.INSERT_DB, SerializeFor.SELECT_DB],
    validators: [
      {
        resolver: presenceValidator(),
        code: ContractsErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public version: number;

  @prop({
    parser: { resolver: Abi.parse },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.INSERT_DB, SerializeFor.SELECT_DB],
  })
  public abi: unknown[];

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.INSERT_DB, SerializeFor.SELECT_DB],
  })
  public bytecode: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
  })
  public transferOwnershipMethod: string;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  async getById(id: number): Promise<ContractVersion> {
    const data = await runCachedFunction(
      `${CacheKeyPrefix.CONTRACT_ID}:${id}`,
      async () => {
        const data = await this.getContext().mysql.paramExecute(
          `
            SELECT ${this.generateSelectFields()}
            FROM \`${DbTables.CONTRACT_VERSION}\`
            WHERE id = @id
              AND status = ${SqlModelStatus.ACTIVE};
          `,
          { id },
        );
        return data?.length
          ? this.populate(data[0], PopulateFrom.DB)
          : this.reset();
      },
      CacheKeyTTL.EXTRA_LONG,
    );

    const contractVersion = new ContractVersion(data, this.getContext());
    if (!contractVersion.exists()) {
      throw new Error(`Contract version not found`);
    }
    return contractVersion;
  }

  async populateByContractUuid(uuid: string) {
    const data = await runCachedFunction(
      `${CacheKeyPrefix.CONTRACT_VERSION_BY_CONTRACT_UUID}:${uuid}`,
      async () => {
        const data = await this.getContext().mysql.paramExecute(
          `
            SELECT ${this.generateSelectFields('cv')}
            FROM \`${DbTables.CONTRACT_VERSION}\` AS cv
                   LEFT JOIN \`${DbTables.CONTRACT}\` AS c ON (c.id = cv.contract_id)
            WHERE c.contract_uuid = @uuid
              AND c.status = ${SqlModelStatus.ACTIVE};
          `,
          { uuid },
        );
        return data?.length
          ? this.populate(data[0], PopulateFrom.DB)
          : this.reset();
      },
      CacheKeyTTL.EXTRA_LONG,
    );

    const contractVersion = new ContractVersion(data, this.getContext());
    if (!contractVersion.exists()) {
      throw new Error(`Contract version not found`);
    }
    return contractVersion;
  }
}
