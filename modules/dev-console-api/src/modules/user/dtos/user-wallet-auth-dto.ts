import { ModelBase, PopulateFrom, prop } from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { ValidatorErrorCode } from '../../../config/types';

export class UserWalletAuthDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.USER_WALLET_ADDRESS_NOT_PRESENT,
      },
    ],
  })
  public wallet: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.USER_AUTH_SIGNATURE_NOT_PRESENT,
      },
    ],
  })
  public signature: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.USER_AUTH_TIMESTAMP_NOT_PRESENT,
      },
    ],
  })
  public timestamp: number;

  // @prop({
  //   parser: { resolver: stringParser() },
  //   populatable: [PopulateFrom.PROFILE],
  //   validators: [
  //     {
  //       resolver: stringLengthValidator({ maxOrEqual: 60 }),
  //       code: ValidatorErrorCode.USER_REFERRAL_NOT_VALID,
  //     },
  //   ],
  //   defaultValue: null,
  // })
  // public referral: string;
}
