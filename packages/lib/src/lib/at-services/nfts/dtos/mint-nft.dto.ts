import { prop } from '@rawmodel/core';
import { integerParser, stringParser } from '@rawmodel/parsers';
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

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.NFT_MINT_COLLECTION_UUID_NOT_PRESENT,
      },
    ],
  })
  public collection_uuid: string;
}