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
import { SubscriptionPackage } from '@apillon/lib';

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
        resolver: enumInclusionValidator(SubscriptionPackage, true),
        code: ValidatorErrorCode.SUBSCRIPTION_ID_NOT_VALID,
      },
    ],
  })
  public subscription_id: SubscriptionPackage;

  /**
   * If the user is initiating a credit purchase session, not a subscription
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [],
  })
  public credits: boolean;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
  })
  public callbackUrl: string;
}
