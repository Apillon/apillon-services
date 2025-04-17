import { ModelBase, prop } from '../../../base-models/base';
import { presenceValidator } from '@rawmodel/validators';
import { PopulateFrom, ValidatorErrorCode } from '../../../../config/types';

export class DeploySecretDto extends ModelBase {
  /**
   * Environment variable name
   */
  @prop({
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
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

  /**
   * Environment variable value
   */
  @prop({
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
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
