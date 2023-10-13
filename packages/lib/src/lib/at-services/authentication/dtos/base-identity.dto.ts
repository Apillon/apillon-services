import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { emailValidator, presenceValidator } from '@rawmodel/validators';
import { PopulateFrom, ValidatorErrorCode } from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';

export class BaseIdentityDto extends ModelBase {
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
        code: ValidatorErrorCode.IDENTITY_VERIFICATION_TOKEN_NOT_PRESENT,
      },
    ],
  })
  public token: string;
}
