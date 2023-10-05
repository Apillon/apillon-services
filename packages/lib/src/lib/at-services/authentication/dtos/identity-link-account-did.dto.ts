import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { emailValidator, presenceValidator } from '@rawmodel/validators';
import { ModelBase } from '../../../base-models/base';
import { didUriValidator } from '../validators/did-create.validator';
import { JSONParser } from '../../../parsers';
import { ValidatorErrorCode, PopulateFrom } from '../../../../config/types';

export class IdentityLinkAccountDidDto extends ModelBase {
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
        code: ValidatorErrorCode.DID_URI_NOT_PRESENT,
      },
      {
        resolver: didUriValidator(),
        code: ValidatorErrorCode.DID_URI_INVALID,
      },
    ],
  })
  public didUri: string;

  @prop({
    parser: { resolver: JSONParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [],
  })
  public linkParameters: any;

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
