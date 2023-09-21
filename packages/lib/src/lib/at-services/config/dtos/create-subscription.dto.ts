import { prop } from '@rawmodel/core';
import { dateParser, integerParser, stringParser } from '@rawmodel/parsers';
import { PopulateFrom, SerializeFor } from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';

export class CreateSubscriptionDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.ADMIN, //
      PopulateFrom.SERVICE,
    ],
    serializable: [
      SerializeFor.ADMIN, //
      SerializeFor.SERVICE,
    ],
  })
  public project_uuid: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.ADMIN, //
      PopulateFrom.SERVICE,
    ],
    serializable: [
      SerializeFor.ADMIN, //
      SerializeFor.SERVICE,
    ],
  })
  public package_id: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.ADMIN, //
      PopulateFrom.SERVICE,
    ],
    serializable: [
      SerializeFor.ADMIN, //
      SerializeFor.SERVICE,
    ],
  })
  public subscriberEmail: string;

  @prop({
    parser: { resolver: dateParser() },
    populatable: [
      PopulateFrom.ADMIN, //
      PopulateFrom.SERVICE,
    ],
    serializable: [
      SerializeFor.ADMIN, //
      SerializeFor.SERVICE,
    ],
  })
  public expiresOn: Date;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.ADMIN, //
      PopulateFrom.SERVICE,
    ],
    serializable: [
      SerializeFor.ADMIN, //
      SerializeFor.SERVICE,
    ],
  })
  public stripeId: string;
}
