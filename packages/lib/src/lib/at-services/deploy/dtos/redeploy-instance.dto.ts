import { ModelBase, prop } from '../../../base-models/base';
import { stringParser } from '@rawmodel/parsers';
import { PopulateFrom, ValidatorErrorCode } from '../../../../config/types';
import { validateDockerComposeYaml } from './deploy-instance.dto';
import { VirtualMachineDto } from './virtual-machine.dto';
import { presenceValidator, stringLengthValidator } from '@rawmodel/validators';

/**
 * Represents the data transfer object for Backend redeploy request.
 */
export class RedeployInstanceDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  public backend_uuid: string;

  /**
   * Represents content of the Docker Compose file.
   *
   * This variable holds the content of Docker Compose YAML configuration file.
   * It is used to define and manage multi-container Docker applications.
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.ADMIN, PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.DATA_NOT_PRESENT,
      },
      {
        resolver: stringLengthValidator({ minOrEqual: 1 }),
        code: ValidatorErrorCode.DATA_NOT_VALID,
      },

      {
        resolver: validateDockerComposeYaml(),
        code: ValidatorErrorCode.DATA_NOT_VALID,
      },
    ],
  })
  public dockerCompose: string;

  /**
   * Describes virtual machine specifications where docker container will be running.
   */
  @prop({
    parser: { resolver: VirtualMachineDto },
    populatable: [PopulateFrom.ADMIN, PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public virtualMachine: VirtualMachineDto;
}
