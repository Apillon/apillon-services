import { Model, prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { PopulateFrom, ValidatorErrorCode } from '../../../../config/types';

export class UserOAuthDto extends Model<any> {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.USER_OAUTH_TOKEN_NOT_PRESENT,
      },
    ],
  })
  public oauth_token: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.USER_OAUTH_VERIFIER_NOT_PRESENT,
      },
    ],
  })
  public oauth_verifier: string;
}
