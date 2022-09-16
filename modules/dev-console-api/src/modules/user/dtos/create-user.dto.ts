import { Model, prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { emailValidator, presenceValidator } from '@rawmodel/validators';
import { ValidatorErrorCode } from '../../../config/types';

export class CreateUserDto extends Model<any> {
  @prop({
    parser: { resolver: stringParser() },
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.CREATE_USER_DTO_EMAIL_NOT_PRESENT,
      },
      {
        resolver: emailValidator(),
        code: ValidatorErrorCode.CREATE_USER_DTO_EMAIL_NOT_VALID,
      },
    ],
  })
  public email: string;

  @prop({
    parser: { resolver: stringParser() },
  })
  public wallet: string;

  @prop({
    parser: { resolver: stringParser() },
  })
  public name: string;

  @prop({
    parser: { resolver: stringParser() },
  })
  public phone: string;
}
