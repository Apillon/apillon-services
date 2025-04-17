import { ModelBase, prop } from '../../../base-models/base';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  EvmChain,
  PopulateFrom,
  ValidatorErrorCode,
} from '../../../../config/types';
import {
  arrayPresenceValidator,
  enumInclusionValidator,
} from '../../../validators';
import { DeploySecretDto } from '../../deploy/dtos/deploy-secret.dto';

/**
 * Represents the data transfer object for Simplet deploy request.
 */
export class SimpletDeployDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  public project_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  public simplet_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
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
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
  })
  public description: string;

  /**
   * Represents an EVM-compatible blockchain network.
   * This property holds the chain information used for determining where to
   * deploy a smart contract.
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.DATA_NOT_PRESENT,
      },
      {
        resolver: enumInclusionValidator(EvmChain),
        code: ValidatorErrorCode.DATA_NOT_VALID,
      },
    ],
  })
  public chain: EvmChain;

  /**
   * Represents an array of arguments to be passed to a smart contract's
   * constructor during deployment or instantiation.
   *
   * Each element in the array corresponds to a specific parameter required by
   * the smart contract's constructor definition.
   */
  @prop({
    parser: { array: true },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public contractConstructorArguments: any[];

  /**
   * Represents an array of deployment environment variables used in the backend.
   *
   * Each element in the array corresponds to a deployment secret and is defined
   * by the DeploySecretDto type, which outlines the structure and details of
   * the deployment environment variables.
   *
   * This property is used for managing sensitive configuration values that are
   * passed to deployment processes of the backend.
   */
  @prop({
    parser: { array: true, resolver: DeploySecretDto },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: arrayPresenceValidator(),
        code: ValidatorErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public backendVariables: DeploySecretDto[];

  /**
   * Represents an array of DeploySecretDto objects required by the frontend.
   *
   * Each element in the array corresponds to a environment variable and is defined
   * by the DeploySecretDto type, which outlines the structure and details of
   * the deployment environment variables.
   *
   * This property holds deployment environment variables that are used by the
   * frontend build process for managing secure configuration data.
   *
   */
  @prop({
    parser: { array: true, resolver: DeploySecretDto },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: arrayPresenceValidator(),
        code: ValidatorErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public frontendVariables: DeploySecretDto[];

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  apillonApiKey: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  apillonApiSecret: string;
}
