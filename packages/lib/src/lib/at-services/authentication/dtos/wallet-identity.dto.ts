import { prop } from '@rawmodel/core';
import { stringParser, integerParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { PopulateFrom, ValidatorErrorCode } from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';

export class WalletIdentityDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  public walletAddress: string; // Populated from URL path parameter

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.SIGNING_MESSAGE_NOT_PRESENT,
      },
    ],
  })
  public message: string | Uint8Array;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.WALLET_SIGNATURE_NOT_PRESENT,
      },
    ],
  })
  public signature: string | Uint8Array;
}
