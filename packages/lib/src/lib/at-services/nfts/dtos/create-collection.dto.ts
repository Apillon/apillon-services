import { ModelBase, prop } from '../../../base-models/base';
import { booleanParser, integerParser, stringParser } from '@rawmodel/parsers';
import {
  ethAddressValidator,
  numberSizeValidator,
  presenceValidator,
  stringLengthValidator,
} from '@rawmodel/validators';
import {
  EvmChain,
  NFTCollectionType,
  PopulateFrom,
  SerializeFor,
  SubstrateChain,
  ValidatorErrorCode,
} from '../../../../config/types';
import {
  conditionalPresenceValidator,
  enumInclusionValidator,
} from '../../../validators';
import { dropReserveLowerOrEqualToMaxSupplyValidator } from '../validators/create-collection-drop-reserve-validator';
import { validateDropPriceIfDrop } from '../validators/create-collection-drop-price-validator';
import {
  substrateAddressValidator,
  SubstrateChainPrefix,
} from '@apillon/blockchain-lib/substrate';
import { SUBSTRATE_NFTS_MAX_SUPPLY } from '../constants';

// Contains properties which are present for all collections
class CreateCollectionDTOBase extends ModelBase {
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.NFT_COLLECTION_TYPE_NOT_PRESENT,
      },
      {
        resolver: enumInclusionValidator(NFTCollectionType),
        code: ValidatorErrorCode.NFT_COLLECTION_TYPE_NOT_VALID,
      },
    ],
  })
  public collectionType: NFTCollectionType;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.NFT_DEPLOY_SYMBOL_NOT_PRESENT,
      },
      {
        resolver: stringLengthValidator({ minOrEqual: 1, maxOrEqual: 8 }),
        code: ValidatorErrorCode.NFT_DEPLOY_SYMBOL_NOT_VALID,
      },
    ],
  })
  public symbol: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.NFT_DEPLOY_NAME_NOT_PRESENT,
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
        code: ValidatorErrorCode.NFT_DEPLOY_PROJECT_UUID_NOT_PRESENT,
      },
    ],
  })
  public project_uuid: string;

  @prop({
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.NFT_DEPLOY_MINT_PRICE_NOT_PRESENT,
      },
      {
        resolver: validateDropPriceIfDrop(0.00001, 10000000000),
        code: ValidatorErrorCode.NFT_DEPLOY_MINT_PRICE_NOT_VALID,
      },
    ],
  })
  public dropPrice: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    setter(value: string) {
      if (value && value.length > 0) {
        value = (value.startsWith('.') ? '' : '.') + value;
      }
      return value;
    },
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.NFT_DEPLOY_BASE_EXTENSION_NOT_PRESENT,
      },
      {
        resolver: stringLengthValidator({ minOrEqual: 1, maxOrEqual: 2000 }),
        code: ValidatorErrorCode.NFT_DEPLOY_BASE_EXTENSION_NOT_VALID,
      },
    ],
  })
  public baseExtension: string;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.NFT_DEPLOY_DROP_BOOL_NOT_PRESENT,
      },
    ],
  })
  public drop: boolean;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.NFT_DEPLOY_DROP_TIMESTAMP_NOT_PRESENT,
      },
    ],
  })
  public dropStart: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.NFT_DEPLOY_RESERVE_NOT_PRESENT,
      },
      {
        resolver: numberSizeValidator({ minOrEqual: 0 }),
        code: ValidatorErrorCode.NFT_DEPLOY_DROP_RESERVE_NOT_VALID,
      },
      {
        resolver: dropReserveLowerOrEqualToMaxSupplyValidator(),
        code: ValidatorErrorCode.NFT_DEPLOY_DROP_RESERVE_GREATER_THAN_MAX_SUPPLY,
      },
    ],
  })
  public dropReserve: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: stringLengthValidator({ minOrEqual: 0, maxOrEqual: 1000 }),
        code: ValidatorErrorCode.NFT_DEPLOY_COLLECTION_DESCRIPTION_NOT_VALID,
      },
    ],
  })
  public description: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [],
  })
  public baseUri: string;
}

// Contains properties from base DTO, with baseUri nullable and additional properties
export class CreateCollectionDTO extends CreateCollectionDTOBase {
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
        resolver: numberSizeValidator({ minOrEqual: 0 }),
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
        resolver: ethAddressValidator(),
        code: ValidatorErrorCode.NFT_COLLECTION_ROYALTIES_ADDRESS_NOT_VALID,
      },
    ],
  })
  public royaltiesAddress: string;

  @prop({
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: numberSizeValidator({ minOrEqual: 0, maxOrEqual: 100 }),
        code: ValidatorErrorCode.NFT_COLLECTION_ROYALTIES_FEES_NOT_VALID,
      },
    ],
  })
  public royaltiesFees: number;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.NFT_COLLECTION_REVOKABLE_NOT_PRESENT,
      },
    ],
    defaultValue: false,
  })
  public isRevokable: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.NFT_COLLECTION_SOULBOUND_NOT_PRESENT,
      },
    ],
    defaultValue: false,
  })
  public isSoulbound: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [],
    defaultValue: true,
  })
  public isAutoIncrement: boolean;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.NFT_COLLECTION_CHAIN_NOT_PRESENT,
      },
      {
        resolver: enumInclusionValidator(EvmChain),
        code: ValidatorErrorCode.NFT_COLLECTION_CHAIN_NOT_VALID,
      },
    ],
  })
  public chain: EvmChain;
}

// Same as base DTO with baseUri required.
// Substrate NFTs do not support properties such as isRevokable, isSoulboud, isAutoIncrement etc.
// For now no additional properties, may be added in the future
export class CreateSubstrateCollectionDTO extends CreateCollectionDTOBase {
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
        resolver: conditionalPresenceValidator(
          'drop',
          (fieldValue) => fieldValue === true,
        ),
        code: ValidatorErrorCode.DATA_NOT_PRESENT,
      },
      {
        resolver: substrateAddressValidator(SubstrateChainPrefix.ASTAR),
        code: ValidatorErrorCode.NFT_COLLECTION_ROYALTIES_ADDRESS_NOT_VALID,
      },
    ],
  })
  public royaltiesAddress: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.NFT_COLLECTION_CHAIN_NOT_PRESENT,
      },
      {
        resolver: enumInclusionValidator(SubstrateChain),
        code: ValidatorErrorCode.NFT_COLLECTION_CHAIN_NOT_VALID,
      },
    ],
  })
  public chain: SubstrateChain;
}
