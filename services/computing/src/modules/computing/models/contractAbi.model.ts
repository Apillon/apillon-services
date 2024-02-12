import {
  AdvancedSQLModel,
  ComputingContractType,
  Context,
  enumInclusionValidator,
  PopulateFrom,
  presenceValidator,
  prop,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { integerParser } from '@rawmodel/parsers';
import { ComputingErrorCode, DbTables } from '../../../config/types';

export class ContractAbi extends AdvancedSQLModel {
  public readonly tableName = DbTables.CONTRACT_ABI;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.INSERT_DB],
    validators: [
      {
        resolver: presenceValidator(),
        code: ComputingErrorCode.CONTRACT_TYPE_NOT_PRESENT,
      },
      {
        resolver: enumInclusionValidator(ComputingContractType),
        code: ComputingErrorCode.CONTRACT_TYPE_NOT_VALID,
      },
    ],
    fakeValue: ComputingContractType.SCHRODINGER,
  })
  public contractType: ComputingContractType;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.INSERT_DB],
    validators: [
      {
        resolver: presenceValidator(),
        code: ComputingErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
    fakeValue: 1,
  })
  public version: number;

  @prop({
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.INSERT_DB],
  })
  public abi: {
    source: { hash: string };
    [key: string]: any;
  };

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  /**
   * Returns latest version of contract
   * @param contractType type of contract
   * @returns Promise<ContractAbi>
   */
  public async getLatest(
    contractType: ComputingContractType,
  ): Promise<ContractAbi> {
    const data = await this.getContext().mysql.paramExecute(
      `
          SELECT *
          FROM \`${DbTables.CONTRACT_ABI}\`
          WHERE contractType = @contractType
            AND status <> ${SqlModelStatus.DELETED}
          ORDER BY version DESC LIMIT 1
          ;
        `,
      {
        contractType,
      },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }
}
