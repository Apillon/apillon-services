import { ModelBase, prop } from '../../../base-models/base';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator, stringLengthValidator } from '@rawmodel/validators';
import {
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';
import { arrayPresenceValidator } from '../../../validators';
import yaml from 'js-yaml';
import { HostingSecretDto } from './hosting-secret.dto';
import { VirtualMachineDto } from './virtual-machine.dto';

export class DeployInstanceDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.LOGGER,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
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
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
  })
  public description: string;

  // @prop({
  //   parser: { resolver: stringParser() },
  //   populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  //   validators: [],
  // })
  // public hosting_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
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
    parser: { array: true, resolver: HostingSecretDto },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: arrayPresenceValidator(),
        code: ValidatorErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public secrets: HostingSecretDto[];

  @prop({
    parser: { resolver: VirtualMachineDto },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public virtualMachine: VirtualMachineDto;
}

export class ApillonApiCallHostingDto extends DeployInstanceDto {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public project_uuid: string;
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
