import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator, emailValidator } from '@rawmodel/validators';
import { PopulateFrom } from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';

export class IdentityDidRevokeDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: AuthenticationErrorCode.USER_EMAIL_NOT_PRESENT,
      },
      {
        resolver: emailValidator(),
        code: AuthenticationErrorCode.USER_EMAIL_NOT_VALID,
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
        code: AuthenticationErrorCode.IDENTITY_TOKEN_NOT_PRESENT,
      },
    ],
  })
  public token: string;
}
