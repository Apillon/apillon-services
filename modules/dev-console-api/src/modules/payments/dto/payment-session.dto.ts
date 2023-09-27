import {
  CreditPackages,
  ModelBase,
  PopulateFrom,
  anyPresenceValidator,
  enumInclusionValidator,
  presenceValidator,
} from '@apillon/lib';
import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { ValidatorErrorCode } from '../../../config/types';
import { SubscriptionPackages } from '@apillon/lib';

export class PaymentSessionDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.PROJECT_UUID_NOT_PRESENT,
      },
    ],
  })
  public project_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: anyPresenceValidator([
          'subscription_package_id',
          'credit_package_id',
        ]),
        code: ValidatorErrorCode.SUBSCRIPTION_OR_CREDITS_NOT_PRESENT,
      },
      {
        resolver: enumInclusionValidator(SubscriptionPackages, true),
        code: ValidatorErrorCode.SUBSCRIPTION_PACKAGE_ID_NOT_VALID,
      },
    ],
  })
  public subscription_package_id: SubscriptionPackages;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: anyPresenceValidator([
          'subscription_package_id',
          'credit_package_id',
        ]),
        code: ValidatorErrorCode.SUBSCRIPTION_OR_CREDITS_NOT_PRESENT,
      },
      {
        resolver: enumInclusionValidator(CreditPackages, true),
        code: ValidatorErrorCode.CREDIT_PACKAGE_ID_NOT_VALID,
      },
    ],
  })
  public credit_package_id: CreditPackages;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
  })
  public returnUrl: string;
}
