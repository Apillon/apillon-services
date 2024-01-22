import {
  AdvancedSQLModel,
  Context,
  enumInclusionValidator,
  NFTCollectionType,
  PopulateFrom,
  presenceValidator,
  prop,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { integerParser } from '@rawmodel/parsers';
import { NftsErrorCode, DbTables } from '../../../config/types';

export class ContractVersion extends AdvancedSQLModel {
  public readonly tableName = DbTables.CONTRACT_VERSION;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.INSERT_DB, SerializeFor.SELECT_DB],
    validators: [
      {
        resolver: presenceValidator(),
        code: NftsErrorCode.COLLECTION_TYPE_NOT_PRESENT,
      },
      {
        resolver: enumInclusionValidator(NFTCollectionType),
        code: NftsErrorCode.COLLECTION_TYPE_NOT_VALID,
      },
    ],
    fakeValue: NFTCollectionType.GENERIC,
  })
  public collectionType: NFTCollectionType;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.INSERT_DB, SerializeFor.SELECT_DB],
    validators: [
      {
        resolver: presenceValidator(),
        code: NftsErrorCode.CONTRACT_VERSION_NOT_PRESENT,
      },
    ],
    fakeValue: 1,
  })
  public version: number;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  /**
   * Returns latest version of contract
   * @param collectionType - NFT Collection type
   * @returns Promise<ContractVersion>
   */
  public async getDefaultVersion(
    collectionType: NFTCollectionType,
  ): Promise<number> {
    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT version
        FROM \`${DbTables.CONTRACT_VERSION}\`
        WHERE collectionType = @collectionType
          AND status = ${SqlModelStatus.ACTIVE}
        ORDER BY version DESC LIMIT 1
        ;
      `,
      { collectionType },
    );

    return data?.length ? data[0].version : 1;
  }
}
