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
import {
  ServiceStatusErrorCode,
  ServiceStatusType,
} from '../../../config/types';

export class UpdateServiceStatusDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
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
  })
  public url?: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.ADMIN, PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
      {
        resolver: enumInclusionValidator(ServiceStatusType, false),
        code: ServiceStatusErrorCode.INVALID_TYPE,
      },
    ],
  })
  public type: ServiceStatusType;

  /**
   * status
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public status: SqlModelStatus;
}
