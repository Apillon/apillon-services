import {
  AdvancedSQLModel,
  ComputingContractType,
  Context,
  enumInclusionValidator,
  PopulateFrom,
  presenceValidator,
  prop,
  SqlModelStatus,
} from '@apillon/lib';
import { integerParser } from '@rawmodel/parsers';
import { ComputingErrorCode, DbTables } from '../../../config/types';

export class ContractAbi extends AdvancedSQLModel {
  public readonly tableName = DbTables.CONTRACT;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [],
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
    serializable: [],
    validators: [
      {
        resolver: presenceValidator(),
        code: ComputingErrorCode.CONTRACT_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
    fakeValue: 1,
  })
  public version: number;

  @prop({
    populatable: [PopulateFrom.DB],
    serializable: [],
  })
  public abi: {
    source: { hash: string };
    [key: string]: any;
  };

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  public override async populateById(id: number): Promise<this> {
    return super.populateById(id);
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
            AND version IN (
                SELECT MAX(version)
                FROM \`${DbTables.CONTRACT_ABI}\`
                WHERE contractType = @contractType
                  AND status <> ${SqlModelStatus.DELETED}
            )
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
