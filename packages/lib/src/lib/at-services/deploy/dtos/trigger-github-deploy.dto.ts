import { integerParser, stringParser } from '@rawmodel/parsers';
import { ModelBase, prop } from '../../../base-models/base';
import {
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';
import { presenceValidator } from '@rawmodel/validators';

export class TriggerGithubDeployDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.PROFILE,
      PopulateFrom.ADMIN,
      PopulateFrom.SERVICE,
    ],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  url: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.PROFILE,
      PopulateFrom.ADMIN,
      PopulateFrom.SERVICE,
    ],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  websiteUuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.PROFILE,
      PopulateFrom.ADMIN,
      PopulateFrom.SERVICE,
    ],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [],
  })
  buildCommand: string | null;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.PROFILE,
      PopulateFrom.ADMIN,
      PopulateFrom.SERVICE,
    ],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [],
  })
  installCommand: string | null;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.PROFILE,
      PopulateFrom.ADMIN,
      PopulateFrom.SERVICE,
    ],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  buildDirectory: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.PROFILE,
      PopulateFrom.ADMIN,
      PopulateFrom.SERVICE,
    ],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  apiKey: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.PROFILE,
      PopulateFrom.ADMIN,
      PopulateFrom.SERVICE,
    ],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  apiSecret: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.PROFILE,
      PopulateFrom.ADMIN,
      PopulateFrom.SERVICE,
    ],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  configId: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.PROFILE,
      PopulateFrom.ADMIN,
      PopulateFrom.SERVICE,
    ],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [],
  })
  encryptedVariables: string | null;
}
