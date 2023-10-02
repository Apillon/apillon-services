import {
  Captcha,
  JSONParser,
  ModelBase,
  PopulateFrom,
  SerializeFor,
} from '@apillon/lib';
import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { ValidatorErrorCode } from '../../../config/types';

export class ContactFormDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [SerializeFor.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.CONTACT_FORM_DATA_NOT_PRESENT,
      },
    ],
  })
  firstName: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [SerializeFor.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.CONTACT_FORM_DATA_NOT_PRESENT,
      },
    ],
  })
  lastName: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [SerializeFor.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.CONTACT_FORM_DATA_NOT_PRESENT,
      },
    ],
  })
  email: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [SerializeFor.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.CONTACT_FORM_DATA_NOT_PRESENT,
      },
    ],
  })
  website: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [SerializeFor.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.CONTACT_FORM_DATA_NOT_PRESENT,
      },
    ],
  })
  country: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [SerializeFor.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.CONTACT_FORM_DATA_NOT_PRESENT,
      },
    ],
  })
  product: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [SerializeFor.PROFILE],
  })
  additionalInfo: string;

  /**
   * Captcha token, passed if the user has successfully solved the captcha form
   */
  @prop({
    parser: { resolver: JSONParser() },
    populatable: [PopulateFrom.PROFILE],
  })
  public captcha?: Captcha;
}
