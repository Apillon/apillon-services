import { ModelBase, prop } from '../../../base-models/base';
import { presenceValidator } from '@rawmodel/validators';
import {
  PopulateFrom,
  SerializeFor,
  ValidatorErrorCode,
} from '../../../../config/types';

export class HostingSecretDto extends ModelBase {
  @prop({
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.DATA_NOT_PRESENT,
      },
      {
        resolver: (value: unknown) => {
          return typeof value === 'string';
        },
        code: ValidatorErrorCode.DATA_NOT_VALID,
      },
    ],
  })
  public key: string;

  @prop({
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.DATA_NOT_PRESENT,
      },
      {
        resolver: (value: unknown) => {
          return typeof value === 'string' || typeof value === 'number';
        },
        code: ValidatorErrorCode.DATA_NOT_VALID,
      },
    ],
  })
  public value: string | number;
}
