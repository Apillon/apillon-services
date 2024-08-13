import { booleanParser, integerParser } from '@rawmodel/parsers';
import { ModelBase, prop } from '../../../base-models/base';
import {
  BadRequestErrorCode,
  NotificationType,
  PopulateFrom,
  SerializeFor,
} from '../../../../config/types';
import { enumInclusionValidator } from '../../../validators';

export class CreateNotificationDto extends ModelBase {
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.SERVICE, PopulateFrom.WORKER],
    serializable: [SerializeFor.SERVICE, SerializeFor.WORKER],
    defaultValue: NotificationType.UNKNOWN,
    validators: [
      {
        resolver: enumInclusionValidator(NotificationType, false),
        code: BadRequestErrorCode.INVALID_NOTIFICATION_TYPE,
      },
    ],
  })
  public type: NotificationType;
}
