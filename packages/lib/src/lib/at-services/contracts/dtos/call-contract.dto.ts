import { ModelBase, prop } from '../../../base-models/base';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator, stringLengthValidator } from '@rawmodel/validators';
import {
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';
import { arrayPresenceValidator } from '../../../validators';

export class CallContractDTO extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public contract_uuid: string;

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
        resolver: stringLengthValidator({ minOrEqual: 1, maxOrEqual: 255 }),
        code: ValidatorErrorCode.DATA_NOT_VALID,
      },
    ],
  })
  public methodName: string;

  @prop({
    parser: { array: true },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: arrayPresenceValidator(),
        code: ValidatorErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public methodArguments: unknown[];
}

export class ApillonApiCallContractDTO extends CallContractDTO {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [],
  })
  public project_uuid: string;
}
