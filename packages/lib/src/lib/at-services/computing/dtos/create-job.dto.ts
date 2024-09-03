import { prop } from '../../../base-models/base';
import { dateParser, integerParser, stringParser } from '@rawmodel/parsers';
import { numberSizeValidator, presenceValidator } from '@rawmodel/validators';
import {
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';
import { minutesInFutureValidator } from '../../../validators';
import { BaseComputingEntityDto } from './base-computing-entity.dto';

export class CreateJobDto extends BaseComputingEntityDto {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
  })
  public function_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
  })
  public project_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.COMPUTING_FIELD_NOT_PRESENT,
      },
    ],
  })
  public scriptCid: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: numberSizeValidator({ minOrEqual: 0, maxOrEqual: 10 }),
        code: ValidatorErrorCode.COMPUTING_DESCRIPTION_NOT_VALID,
      },
    ],
    defaultValue: 1,
  })
  public slots: number;

  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.COMPUTING_FIELD_NOT_PRESENT,
      },
      {
        resolver: minutesInFutureValidator(3),
        code: ValidatorErrorCode.JOB_DATE_NOT_VALID,
      },
    ],
  })
  startTime: Date;

  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.COMPUTING_FIELD_NOT_PRESENT,
      },
      {
        resolver: minutesInFutureValidator(15),
        code: ValidatorErrorCode.JOB_DATE_NOT_VALID,
      },
    ],
  })
  endTime: Date;
}
