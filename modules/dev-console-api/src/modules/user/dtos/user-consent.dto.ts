import {
  ModelBase,
  PopulateFrom,
  presenceValidator,
  prop,
  ValidatorErrorCode,
} from '@apillon/lib';
import { dateParser, integerParser } from '@rawmodel/parsers';

export enum UserConsentStatus {
  PENDING = 1,
  ACCEPTED = 5,
  DECLINED = 9,
}

export class UserConsentDto extends ModelBase {
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.DEFAULT_VALIDATOR_ERROR_CODE,
      },
    ],
  })
  public id: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.DEFAULT_VALIDATOR_ERROR_CODE,
      },
    ],
  })
  public type: number;

  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [],
  })
  public dateOfAgreement: Date;

  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.DEFAULT_VALIDATOR_ERROR_CODE,
      },
    ],
  })
  public status: number;
}
