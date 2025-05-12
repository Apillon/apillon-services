import { stringParser } from '@rawmodel/parsers';
import { presenceValidator, stringLengthValidator } from '@rawmodel/validators';
import { ModelBase, PopulateFrom } from '@apillon/lib';
import { ValidatorErrorCode } from '../../../config/types';
import { prop } from '@rawmodel/core';

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

  /**
   * No validators are present in case wallet login is used
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: stringLengthValidator({ minOrEqual: 12, max: 100 }),
        code: ValidatorErrorCode.USER_PASSWORD_INVALID_LENGTH,
      },
    ],
  })
  public password: string;
}
