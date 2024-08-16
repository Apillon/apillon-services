import { ModelBase, prop } from '../../../base-models/base';
import { dateParser, integerParser, stringParser } from '@rawmodel/parsers';
import {
  numberSizeValidator,
  presenceValidator,
  stringLengthValidator,
} from '@rawmodel/validators';
import {
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';
import { minutesInFutureValidator } from '../../../validators';

export class CreateJobDto extends ModelBase {
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
  public deployment_uuid: string;

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
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.COMPUTING_NAME_NOT_PRESENT,
      },
      {
        resolver: stringLengthValidator({ minOrEqual: 1, maxOrEqual: 255 }),
        code: ValidatorErrorCode.COMPUTING_NAME_NOT_VALID,
      },
    ],
  })
  public name: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: stringLengthValidator({ minOrEqual: 0, maxOrEqual: 1000 }),
        code: ValidatorErrorCode.COMPUTING_DESCRIPTION_NOT_VALID,
      },
    ],
  })
  public description: string;

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
        resolver: minutesInFutureValidator(5),
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
