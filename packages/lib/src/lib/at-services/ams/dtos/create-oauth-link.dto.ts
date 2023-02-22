import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { PopulateFrom, ValidatorErrorCode } from '../../../../config/types';
import { ModelBase, prop } from '../../../base-models/base';
export class CreateOauthLinkDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.DEFAULT_VALIDATOR_ERROR_CODE,
      },
    ],
  })
  public externalUserId: string;
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.DEFAULT_VALIDATOR_ERROR_CODE,
      },
    ],
  })
  public externalUsername: string;
}
