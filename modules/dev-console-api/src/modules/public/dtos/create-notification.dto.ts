import {
  ModelBase,
  PopulateFrom,
  SerializeFor,
  enumInclusionValidator,
  prop,
} from '@apillon/lib';
import { BadRequestErrorCode, NotificationType } from '../../../config/types';
import { integerParser } from '@rawmodel/parsers';

export class createNotification extends ModelBase {
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
