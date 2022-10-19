import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { PopulateFrom } from 'at-lib';
import { ModelBase, prop } from 'at-lib/dist/lib/base-models/base';
import { ValidatorErrorCode } from '../../../config/types';

export class RegisterUserDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.TOKEN_NOT_PRESENT,
      },
    ],
  })
  public token: string;

  public email: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.USER_PASSWORD_NOT_PRESENT,
      },
    ],
  })
  public password: string;
}
