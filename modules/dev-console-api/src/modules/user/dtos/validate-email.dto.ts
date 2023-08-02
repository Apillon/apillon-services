import { stringParser } from '@rawmodel/parsers';
import { emailValidator, presenceValidator } from '@rawmodel/validators';
import { JSONParser, ModelBase, PopulateFrom } from '@apillon/lib';
import { ValidatorErrorCode } from '../../../config/types';
import { prop } from '@rawmodel/core';

export class ValidateEmailDto extends ModelBase {
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
    parser: { resolver: JSONParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [],
  })
  public captcha: { eKey: string; token: string };

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
  })
  public refCode: string;
}
