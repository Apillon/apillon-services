import { prop } from '@rawmodel/core';
import { dateParser, floatParser, stringParser } from '@rawmodel/parsers';
import { PopulateFrom, SerializeFor } from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';

export class UpdateSubscriptionDto extends ModelBase {
  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.SERVICE],
    serializable: [SerializeFor.PROFILE, SerializeFor.SERVICE],
  })
  public cancelDate: Date;

  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.SERVICE],
    serializable: [SerializeFor.PROFILE, SerializeFor.SERVICE],
  })
  public expiresOn: Date;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.SERVICE],
    serializable: [SerializeFor.PROFILE, SerializeFor.SERVICE],
  })
  public stripePackageId: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.SERVICE],
    serializable: [SerializeFor.PROFILE, SerializeFor.SERVICE],
  })
  public subscriptionStripeId: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.SERVICE],
    serializable: [SerializeFor.PROFILE, SerializeFor.SERVICE],
  })
  public cancellationReason: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.SERVICE],
    serializable: [SerializeFor.PROFILE, SerializeFor.SERVICE],
  })
  public cancellationComment: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.SERVICE],
    serializable: [SerializeFor.PROFILE, SerializeFor.SERVICE],
  })
  public invoiceStripeId: string;

  @prop({
    parser: { resolver: floatParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.SERVICE],
    serializable: [SerializeFor.PROFILE, SerializeFor.SERVICE],
  })
  public amount: number;
}
