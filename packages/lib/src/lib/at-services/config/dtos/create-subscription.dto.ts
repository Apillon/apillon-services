import { prop } from '@rawmodel/core';
import { dateParser, integerParser, stringParser } from '@rawmodel/parsers';
import { PopulateFrom, SerializeFor } from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';
import { getFaker } from '../../../utils';
import { v4 as uuid } from 'uuid';

export class CreateSubscriptionDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.ADMIN, //
      PopulateFrom.PROFILE,
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
      PopulateFrom.PROFILE,
      PopulateFrom.SERVICE,
    ],
    serializable: [
      SerializeFor.ADMIN, //
      PopulateFrom.PROFILE,
      SerializeFor.SERVICE,
    ],
  })
  public package_id: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.ADMIN, //
      PopulateFrom.PROFILE,
      PopulateFrom.SERVICE,
    ],
    serializable: [
      SerializeFor.ADMIN, //
      SerializeFor.SERVICE,
    ],
    fakeValue: () => getFaker().internet.email(),
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
      PopulateFrom.PROFILE,
      SerializeFor.SERVICE,
    ],
    fakeValue: () => getFaker().date.soon(30),
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
      PopulateFrom.PROFILE,
      SerializeFor.SERVICE,
    ],
    fakeValue: uuid(),
  })
  public stripeId: string;
}
