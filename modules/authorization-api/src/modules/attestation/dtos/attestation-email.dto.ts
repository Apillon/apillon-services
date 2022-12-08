import { ModelBase, PopulateFrom } from '@apillon/lib';
import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator, emailValidator } from '@rawmodel/validators';
import { AuthorizationErrorCode } from '../../../config/types';

export class AttestationEmailDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: AuthorizationErrorCode.USER_EMAIL_NOT_PRESENT,
      },
      {
        resolver: emailValidator(),
        code: AuthorizationErrorCode.USER_EMAIL_NOT_VALID,
      },
    ],
  })
  public email: string;
}
