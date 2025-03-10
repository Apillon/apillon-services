import { ModelBase, prop } from '../../../base-models/base';
import { presenceValidator } from '@rawmodel/validators';
import { ValidatorErrorCode } from '../../../../config/types';

export class VirtualMachineDto extends ModelBase {
  @prop({
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.DATA_NOT_PRESENT,
      },
      {
        resolver: (value: number) => Number.isInteger(value) && value > 0,
        code: ValidatorErrorCode.DATA_NOT_VALID,
      },
    ],
    defaultValue: 1,
  })
  public cpuCount: number;

  @prop({
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.DATA_NOT_PRESENT,
      },
      {
        resolver: (value: number) => Number.isInteger(value) && value > 0,
        code: ValidatorErrorCode.DATA_NOT_VALID,
      },
    ],
    defaultValue: 4096,
  })
  public memory: number;

  @prop({
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.DATA_NOT_PRESENT,
      },
      {
        resolver: (value: number) => Number.isInteger(value) && value > 0,
        code: ValidatorErrorCode.DATA_NOT_VALID,
      },
    ],
    defaultValue: 40,
  })
  public diskSize: number;
}
