import { prop } from '../../../base-models/base';
import { ValidatorErrorCode } from '../../../../config/types';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { VirtualMachineDto } from './virtual-machine.dto';

export interface IVMResourceRequest {
  vcpu: number;
  memory: number;
  disk_size: number;
  allow_restart: number;
}

export class ResizeInstanceDto extends VirtualMachineDto {
  @prop({
    parser: { resolver: stringParser() },
  })
  public deploy_uuid: string;

  @prop({
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.DATA_NOT_PRESENT,
      },
    ],
    defaultValue: 40,
  })
  public allowRestart: boolean;
}
