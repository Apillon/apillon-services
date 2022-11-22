import { ModelBase, PopulateFrom } from '@apillon/lib';
import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator, emailValidator } from '@rawmodel/validators';
import { ModuleValidatorErrorCode } from '../../../config/types';

// TODO: Check correct validators
export class AttestationCreateDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ModuleValidatorErrorCode.ATTEST_DID_URI_NOT_PRESENT,
      },
    ],
  })
  public didUri: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ModuleValidatorErrorCode.USER_EMAIL_NOT_PRESENT,
      },
      {
        resolver: emailValidator(),
        code: ModuleValidatorErrorCode.USER_EMAIL_NOT_VALID,
      },
    ],
  })
  public email: string;
}
