import {
  ModelBase,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  ValidatorErrorCode,
  enumInclusionValidator,
  presenceValidator,
  prop,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { BadRequestErrorCode, ServiceStatusType } from '../../../config/types';

export class CreateOrUpdateServiceStatusDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    serializable: [SerializeFor.ADMIN, SerializeFor.PROFILE],
    populatable: [PopulateFrom.ADMIN, PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public message: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.ADMIN, PopulateFrom.PROFILE],
    serializable: [SerializeFor.ADMIN, SerializeFor.PROFILE],
  })
  public url?: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.ADMIN, PopulateFrom.PROFILE],
    serializable: [SerializeFor.ADMIN, SerializeFor.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
      {
        resolver: enumInclusionValidator(ServiceStatusType, false),
        code: BadRequestErrorCode.INVALID_SERVICE_STATUS_TYPE,
      },
    ],
  })
  public type: ServiceStatusType;

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
