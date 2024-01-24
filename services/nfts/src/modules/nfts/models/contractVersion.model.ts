import { NftsCodeException } from './../../../lib/exceptions';
import {
  AdvancedSQLModel,
  ChainType,
  Context,
  enumInclusionValidator,
  NFTCollectionType,
  PopulateFrom,
  presenceValidator,
  prop,
  SerializeFor,
  SqlModelStatus,
  LogType,
  runCachedFunction,
  CacheKeyPrefix,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { NftsErrorCode, DbTables } from '../../../config/types';

export class ContractVersion extends AdvancedSQLModel {
  public readonly tableName = DbTables.CONTRACT_VERSION;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.UPDATE_DB,
    ],
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

    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.UPDATE_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: NftsErrorCode.CHAIN_TYPE_NOT_PRESENT,
      },
      {
        resolver: enumInclusionValidator(ChainType),
        code: NftsErrorCode.CHAIN_TYPE_NOT_VALID,
      },
    ],
    fakeValue: ChainType.EVM,
  })
  public chainType: ChainType;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.UPDATE_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: NftsErrorCode.CONTRACT_VERSION_NOT_PRESENT,
      },
    ],
    fakeValue: 1,
  })
  public version: number;

  @prop({
    // Can also be JSON parser if object data is needed
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.INSERT_DB, SerializeFor.SELECT_DB],
  })
  public abi: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.INSERT_DB, SerializeFor.SELECT_DB],
  })
  public bytecode: string;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  /**
   * Returns contract artifact from latest version of contract
   * @param collectionType - NFT Collection type
   * @param version_id - id of contract version to get. If null, get latest version
   * @param contractArtifact - Get ABI or get bytecode
   * @param chainType - chain type of NFT
   * @returns Promise<{ version: string } & { [key in ContractArtifact]: string }>
   * @throws NftsCodeException - if contract artifact has not been found for given version
   */
  public async getContractVersion(
    collectionType: NFTCollectionType,
    version_id: number = null,
    chainType: ChainType = ChainType.EVM,
  ): Promise<ContractVersion> {
    try {
      const contractVersion = await runCachedFunction(
        `${CacheKeyPrefix.CONTRACT_VERSION}:${[
          collectionType,
          version_id,
          chainType,
        ].join(':')}`,
        async () => {
          const data = await this.getContext().mysql.paramExecute(
            `
            SELECT ${this.generateSelectFields()}
            FROM \`${DbTables.CONTRACT_VERSION}\`
            WHERE collectionType = @collectionType
            AND chainType = @chainType
            ${version_id ? 'AND id = @version' : ''}
            AND status = ${SqlModelStatus.ACTIVE}
            ${version_id ? '' : 'ORDER BY version DESC LIMIT 1'}
            ;
        `,
            { collectionType, chainType },
          );
          return data?.length
            ? this.populate(data[0], PopulateFrom.DB)
            : this.reset();
        },
      );
      if (!contractVersion.exists()) {
        throw new Error(`Contract artifacts not found`);
      }
      return contractVersion;
    } catch (err) {
      throw await new NftsCodeException({
        status: 500,
        errorMessage: `Error getting NFT contract artifacts for type ${collectionType} and version ${version_id}`,
        code: NftsErrorCode.GENERAL_SERVER_ERROR,
      }).writeToMonitor({
        context: this.getContext(),
        logType: LogType.ERROR,
        data: { err, collectionType, chainType, version: version_id },
      });
    }
  }
}
