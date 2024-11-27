import { integerParser, stringParser } from '@rawmodel/parsers';
import { ModelBase, prop } from '../../../base-models/base';
import {
  BadRequestErrorCode,
  NotificationType,
  PopulateFrom,
  SerializeFor,
} from '../../../../config/types';
import { enumInclusionValidator } from '../../../validators';

export class CreateOrUpdateNotificationDto extends ModelBase {
  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.SERVICE,
      PopulateFrom.WORKER,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.SERVICE,
      SerializeFor.WORKER,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: enumInclusionValidator(NotificationType, true),
        code: BadRequestErrorCode.INVALID_NOTIFICATION_TYPE,
      },
      {
        resolver: async function () {
          return this.type != null || this.message != null;
        },
        code: BadRequestErrorCode.NOTIFICATION_TYPE_OR_MESSAGE_MISSING,
      },
    ],
  })
  public type?: NotificationType;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.SERVICE,
      PopulateFrom.WORKER,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.SERVICE,
      SerializeFor.WORKER,
      SerializeFor.PROFILE,
    ],
  })
  public message?: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.SERVICE,
      PopulateFrom.WORKER,
      PopulateFrom.PROFILE,
      PopulateFrom.ADMIN,
      PopulateFrom.DB,
    ],
    serializable: [
      SerializeFor.SERVICE,
      SerializeFor.WORKER,
      SerializeFor.ADMIN,
      SerializeFor.PROFILE,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.APILLON_API,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
    ],
  })
  public userId?: number;
}
