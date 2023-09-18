import {
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
        resolver: anyPresenceValidator(['subscription_id', 'credits']),
        code: ValidatorErrorCode.SUBSCRIPTION_OR_CREDITS_NOT_PRESENT,
      },
      {
        resolver: enumInclusionValidator(SubscriptionPackages, true),
        code: ValidatorErrorCode.SUBSCRIPTION_ID_NOT_VALID,
      },
    ],
  })
  public subscription_id: SubscriptionPackages;

  /**
   * If the user is initiating a credit purchase session, not a subscription
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [],
    defaultValue: false,
  })
  public credits: boolean;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
  })
  public returnUrl: string;
}
