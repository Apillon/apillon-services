import { booleanParser, integerParser } from '@rawmodel/parsers';
import {
  NotificationType,
  PopulateFrom,
  ValidatorErrorCode,
} from '../../../../config/types';
import { BaseQueryFilter, enumInclusionValidator, prop } from '../../../..';

export class NotificationQueryFilter extends BaseQueryFilter {
  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  public isRead?: boolean;

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
