import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { ModelBase, prop } from '../../../base-models/base';
import { PopulateFrom, SerializeFor, ValidatorErrorCode } from '../../../..';
import { emailValidator } from '@rawmodel/validators';

export class ValidateOtpDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.USER_EMAIL_NOT_PRESENT,
      },
      {
        resolver: emailValidator(),
        code: ValidatorErrorCode.USER_EMAIL_NOT_VALID,
      },
    ],
  })
  public email: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.OTP_CODE_NOT_PRESENT,
      },
    ],
  })
  public code: string;

  // @prop({
  //   parser: { resolver: stringParser() },
  //   populatable: [PopulateFrom.PROFILE],
  //   serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
  //   validators: [
  //     {
  //       resolver: presenceValidator(),
  //       code: ValidatorErrorCode.VALIDATE_OTP_REQUIRED_DATA_NOT_PRESENT,
  //     },
  //   ],
  // })
  // public token: string;
}
