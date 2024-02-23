import { ModelBase, prop } from '../../../base-models/base';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator, stringLengthValidator } from '@rawmodel/validators';
import {
  ComputingContractType,
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';
import { enumInclusionValidator } from '../../../validators';
import { computingContractDataValidator } from '../validators/substrate-address-validator';

export class CreateContractDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.COMPUTING_PROJECT_UUID_NOT_PRESENT,
      },
    ],
  })
  public project_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [],
  })
  public bucket_uuid: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.COMPUTING_CONTRACT_TYPE_NOT_PRESENT,
      },
      {
        resolver: enumInclusionValidator(ComputingContractType),
        code: ValidatorErrorCode.COMPUTING_CONTRACT_TYPE_NOT_VALID,
      },
    ],
  })
  public contractType: ComputingContractType;

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

  /**
   * Contract-specific data, may vary based on contract type
   * Validated on contract creation based on type
   */
  @prop({
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.COMPUTING_FIELD_NOT_PRESENT,
      },
      {
        resolver: computingContractDataValidator(),
        code: ValidatorErrorCode.COMPUTING_CONTRACT_DATA_NOT_VALID,
      },
    ],
  })
  contractData: SchrodingerContractData;
}

export type SchrodingerContractData = {
  nftContractAddress: string;
  nftChainRpcUrl: string;
  restrictToOwner: boolean;
};
