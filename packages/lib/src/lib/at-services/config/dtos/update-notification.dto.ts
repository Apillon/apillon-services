import { booleanParser, integerParser } from '@rawmodel/parsers';
import { ModelBase, prop } from '../../../base-models/base';
import {
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  ValidatorErrorCode,
} from '../../../../config/types';
import { presenceValidator } from '../../../validators';

export class UpdateNotificationDto extends ModelBase {
  @prop({
    parser: { resolver: booleanParser() },
    serializable: [SerializeFor.ADMIN, SerializeFor.PROFILE],
    populatable: [PopulateFrom.ADMIN, PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public isRead: boolean;

  /**
   * status
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.ADMIN, PopulateFrom.PROFILE],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    defaultValue: SqlModelStatus.ACTIVE,
  })
  public status: SqlModelStatus;
}
