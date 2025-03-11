import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { emailValidator, presenceValidator } from '@rawmodel/validators';
import { PopulateFrom, ValidatorErrorCode } from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';
import { Captcha } from '../../../captcha';
import { JSONParser } from '../../../parsers';

export class GenerateOtpDto extends ModelBase {
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

  /**
   * Captcha token, passed if the user has successfully solved the captcha form
   */
  @prop({
    parser: { resolver: JSONParser() },
    populatable: [PopulateFrom.PROFILE],
  })
  public captcha?: Captcha;
}
