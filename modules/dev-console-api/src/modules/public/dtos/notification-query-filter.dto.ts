import {
  BaseQueryFilter,
  PopulateFrom,
  enumInclusionValidator,
  prop,
} from '@apillon/lib';
import { BadRequestErrorCode, NotificationType } from '../../../config/types';
import { booleanParser, integerParser } from '@rawmodel/parsers';

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
        code: BadRequestErrorCode.INVALID_NOTIFICATION_TYPE,
      },
    ],
  })
  public type?: NotificationType;
}
