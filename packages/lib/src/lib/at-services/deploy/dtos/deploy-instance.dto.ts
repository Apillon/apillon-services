import { ModelBase, prop } from '../../../base-models/base';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator, stringLengthValidator } from '@rawmodel/validators';
import { PopulateFrom, ValidatorErrorCode } from '../../../../config/types';
import { arrayPresenceValidator } from '../../../validators';
import yaml from 'js-yaml';
import { DeploySecretDto } from './deploy-secret.dto';
import { VirtualMachineDto } from './virtual-machine.dto';

export class DeployInstanceDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.ADMIN, PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public name: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.ADMIN, PopulateFrom.PROFILE],
  })
  public description: string;

  // @prop({
  //   parser: { resolver: stringParser() },
  //
  //   validators: [],
  // })
  // public deploy_uuid: string;

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

  @prop({
    parser: { array: true, resolver: DeploySecretDto },
    populatable: [PopulateFrom.ADMIN, PopulateFrom.PROFILE],
    validators: [
      {
        resolver: arrayPresenceValidator(),
        code: ValidatorErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public secrets: DeploySecretDto[];

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

export function validateDockerComposeYaml(allowEmpty = false) {
  return function (this: any, value: any): boolean {
    if (allowEmpty && !!value) {
      return true;
    }
    try {
      const parsed = yaml.load(value);
      if (!parsed || typeof parsed !== 'object') {
        return false;
      }
      const servicesCount =
        parsed.services && typeof parsed.services === 'object'
          ? Object.keys(parsed.services).length
          : 0;
      return servicesCount > 0;
    } catch (error) {
      return false;
    }
  };
}
