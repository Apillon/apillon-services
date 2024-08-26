import { booleanParser, integerParser } from '@rawmodel/parsers';
import {
  NotificationType,
  PopulateFrom,
  ValidatorErrorCode,
} from '../../../../config/types';
import { BaseQueryFilter } from '../../../base-models/base-query-filter.model';
import { prop } from '../../../base-models/base';
import { enumInclusionValidator } from '../../../validators';

export class NotificationQueryFilter extends BaseQueryFilter {
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: enumInclusionValidator(NotificationType, true),
        code: ValidatorErrorCode.INVALID_NOTIFICATION_TYPE,
      },
    ],
  })
  public type?: NotificationType;
}
