import { NftsCodeException } from '../../../lib/exceptions';
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
  CacheKeyTTL,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
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
   * Returns contract version from latest version_id of contract
   * @param collectionType - NFT Collection type
   * @param version_id - id of contract version to get. If null, get latest version
   * @param chainType - chain type of NFT
   * @returns Promise<ContractVersion>
   * @throws NftsCodeException - if contract version has not been found for given params
   */
  public async getContractVersion(
    collectionType: NFTCollectionType,
    chainType: ChainType = ChainType.EVM,
    version_id: number = null,
  ): Promise<ContractVersion> {
    try {
      const data = await runCachedFunction(
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
                AND chainType = @chainType ${version_id ? 'AND id = @version_id' : ''}
            AND status = ${SqlModelStatus.ACTIVE} ${version_id ? '' : 'ORDER BY version DESC LIMIT 1'}
              ;
            `,
            { collectionType, chainType, version_id },
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
    } catch (err) {
      throw await new NftsCodeException({
        status: 500,
        errorMessage: `Error getting NFT contract version for type ${collectionType} and version ${version_id}`,
        code: NftsErrorCode.GENERAL_SERVER_ERROR,
      }).writeToMonitor({
        context: this.getContext(),
        logType: LogType.ERROR,
        data: { err, collectionType, chainType, version: version_id },
        sendAdminAlert: true,
      });
    }
  }

  /**
   * Returns contract ABI from latest version of contract
   * @param collectionType - NFT Collection type
   * @param version_id - id of contract version to get. If null, get latest version
   * @param chainType - chain type of NFT
   * @returns Promise<string>
   * @throws NftsCodeException - if contract ABI has not been found for given params
   */
  public async getContractAbi(
    collectionType: NFTCollectionType,
    version_id: number = null,
    chainType: ChainType = ChainType.EVM,
  ): Promise<string> {
    try {
      const abi = await runCachedFunction(
        `${CacheKeyPrefix.CONTRACT_ABI}:${[
          collectionType,
          version_id,
          chainType,
        ].join(':')}`,
        async () => {
          const data = await this.getContext().mysql.paramExecute(
            `
              SELECT abi
              FROM \`${DbTables.CONTRACT_VERSION}\`
              WHERE collectionType = @collectionType
              AND chainType = @chainType
              AND id = @version_id
              AND status = ${SqlModelStatus.ACTIVE}
              ;
          `,
            { collectionType, chainType, version_id },
          );
          return data?.length ? data[0].abi : null;
        },
        CacheKeyTTL.EXTRA_LONG,
      );
      if (!abi) {
        throw new Error(`ABI not found`);
      }
      return abi;
    } catch (err) {
      throw await new NftsCodeException({
        status: 500,
        errorMessage: `Error getting NFT contract ABI for type ${collectionType} and version ${version_id}`,
        code: NftsErrorCode.GENERAL_SERVER_ERROR,
      }).writeToMonitor({
        context: this.getContext(),
        logType: LogType.ERROR,
        data: { err, collectionType, chainType, version: version_id },
        sendAdminAlert: true,
      });
    }
  }
}
