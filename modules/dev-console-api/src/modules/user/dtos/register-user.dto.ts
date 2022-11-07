import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { PopulateFrom } from '@apillon/lib';
import { ModelBase, prop } from '@apillon/lib/dist/lib/base-models/base';
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
