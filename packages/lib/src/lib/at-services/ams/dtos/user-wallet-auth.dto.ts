import { booleanParser, integerParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { PopulateFrom, ValidatorErrorCode } from '../../../../config/types';
import { ModelBase, prop } from '../../../base-models/base';

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

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.PROFILE],
    defaultValue: false,
  })
  public isEvmWallet: boolean;
}
