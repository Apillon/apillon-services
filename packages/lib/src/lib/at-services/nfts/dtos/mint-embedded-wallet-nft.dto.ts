import { UserWalletAuthDto } from '../../ams/dtos/user-wallet-auth.dto';
import { prop } from '@rawmodel/core';
import { arrayParser, integerParser, stringParser } from '@rawmodel/parsers';
import {
  ethAddressValidator,
  numberSizeValidator,
  presenceValidator,
} from '@rawmodel/validators';
import { PopulateFrom, ValidatorErrorCode } from '../../../../config/types';

export class MintEmbeddedWalletNftDTO extends UserWalletAuthDto {
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
    validators: [],
  })
  public collection_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public message: string;

  @prop({
    parser: { resolver: arrayParser() },
    populatable: [],
    defaultValue: [],
  })
  public idsToMint: number[];
}
