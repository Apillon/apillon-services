import { prop } from '@rawmodel/core';
import { arrayParser, integerParser, stringParser } from '@rawmodel/parsers';
import {
  ethAddressValidator,
  numberSizeValidator,
  presenceValidator,
} from '@rawmodel/validators';
import { PopulateFrom, ValidatorErrorCode } from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';

export class MintNftDTO extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.NFT_MINT_ADDRESS_NOT_PRESENT,
      },
      {
        resolver: ethAddressValidator(),
        code: ValidatorErrorCode.NFT_MINT_ADDRESS_NOT_VALID,
      },
    ],
  })
  public receivingAddress: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.NFT_MINT_QUANTITY_NOT_PRESENT,
      },
      {
        resolver: numberSizeValidator({ minOrEqual: 1, maxOrEqual: 20 }),
        code: ValidatorErrorCode.NFT_MINT_QUANTITY_NOT_VALID,
      },
    ],
  })
  public quantity: number;

  /**
   * If minting custom token IDs - only when collection.isAutoIncrement=false
   */
  @prop({
    parser: { resolver: arrayParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    defaultValue: [],
  })
  public idsToMint: number[];

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public collection_uuid: string;
}

export class NestMintNftDTO extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.NFT_MINT_PARENT_COLLECTION_ID_NOT_PRESENT,
      },
    ],
  })
  public parentCollectionUuid: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.NFT_MINT_PARENT_NFT_ID_NOT_PRESENT,
      },
    ],
  })
  public parentNftId: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public collection_uuid: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.NFT_MINT_QUANTITY_NOT_PRESENT,
      },
      {
        resolver: numberSizeValidator({ minOrEqual: 1, maxOrEqual: 20 }),
        code: ValidatorErrorCode.NFT_MINT_QUANTITY_NOT_VALID,
      },
    ],
  })
  public quantity: number;
}
