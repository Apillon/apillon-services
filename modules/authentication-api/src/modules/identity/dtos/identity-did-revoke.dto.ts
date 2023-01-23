import { ModelBase, PopulateFrom } from '@apillon/lib';
import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator, emailValidator } from '@rawmodel/validators';
import { AuthenticationErrorCode } from '../../../config/types';
import { didUriValidator } from '../validators/did-create.validator';

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
        code: AuthenticationErrorCode.DID_URI_NOT_PRESENT,
      },
      {
        resolver: didUriValidator(),
        code: AuthenticationErrorCode.DID_URI_INVALID,
      },
    ],
  })
  public didUri: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
  })
  public token: string;
}
