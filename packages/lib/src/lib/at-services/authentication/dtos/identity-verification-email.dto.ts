import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  EmailTemplate,
  PopulateFrom,
  ValidatorErrorCode,
} from '../../../../config/types';
import { JSONParser } from '../../../parsers';
import { Captcha } from '../../../captcha';
import { BaseIdentityDto } from './base-identity.dto';

export class VerificationEmailDto extends BaseIdentityDto {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.IDENTITY_VERIFICATION_EMAIL_TYPE_NOT_PRESENT,
      },
    ],
  })
  public type: EmailTemplate;

  @prop({
    parser: { resolver: JSONParser() },
    populatable: [PopulateFrom.PROFILE],
  })
  public captcha: Captcha;
}
