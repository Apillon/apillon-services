import {
  ModelBase,
  PopulateFrom,
  prop,
  SerializeFor,
  SUBSTRATE_NFTS_MAX_SUPPLY,
  ValidatorErrorCode,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  numberSizeValidator,
  presenceValidator,
  stringLengthValidator,
} from '@rawmodel/validators';
import {
  substrateAddressValidator,
  SubstrateChainPrefix,
} from '../../../../substrate';
import { CreateCollectionDtoGenericBase } from './create-collection.dto';

export class MetadataAttributes extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public value: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public trait_type: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public display_type: string;
}

export class Metadata extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
      {
        resolver: stringLengthValidator({ minOrEqual: 1, maxOrEqual: 255 }),
        code: ValidatorErrorCode.NFT_DEPLOY_NAME_NOT_VALID,
      },
    ],
  })
  public name: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
      {
        resolver: stringLengthValidator({ minOrEqual: 1, maxOrEqual: 255 }),
        code: ValidatorErrorCode.NFT_DEPLOY_NAME_NOT_VALID,
      },
    ],
  })
  public description: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
      {
        resolver: stringLengthValidator({ minOrEqual: 1, maxOrEqual: 255 }),
        code: ValidatorErrorCode.NFT_DEPLOY_NAME_NOT_VALID,
      },
    ],
  })
  public image: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public attributes: MetadataAttributes;
}

export class ApiCreateUniqueCollectionDTO extends CreateCollectionDtoGenericBase {
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.NFT_DEPLOY_MAX_SUPPLY_NOT_PRESENT,
      },
      {
        resolver: numberSizeValidator({
          minOrEqual: 0,
          maxOrEqual: SUBSTRATE_NFTS_MAX_SUPPLY,
        }),
        code: ValidatorErrorCode.NFT_DEPLOY_MAX_SUPPLY_NOT_VALID,
      },
    ],
  })
  public maxSupply: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: substrateAddressValidator(SubstrateChainPrefix.UNIQUE),
        code: ValidatorErrorCode.NFT_COLLECTION_ROYALTIES_ADDRESS_NOT_VALID,
      },
    ],
  })
  public royaltiesAddress: string;

  @prop({
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public metadata: { [tokenId: string]: Metadata };
}

export class CreateUniqueCollectionDTO extends ApiCreateUniqueCollectionDTO {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.NFT_DEPLOY_PROJECT_UUID_NOT_PRESENT,
      },
    ],
  })
  public project_uuid: string;
}
