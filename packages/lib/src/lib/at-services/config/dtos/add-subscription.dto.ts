import { dateParser, integerParser } from '@rawmodel/parsers';
import { ModelBase, prop } from '../../../base-models/base';
import {
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';
import { presenceValidator } from '../../../validators';

export class AddSubscriptionDto extends ModelBase {
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public packageId: number;

  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.ADMIN, PopulateFrom.SERVICE],
    serializable: [
      SerializeFor.ADMIN, //
      PopulateFrom.PROFILE,
      SerializeFor.SERVICE,
    ],
  })
  public expiresOn: Date;
}
