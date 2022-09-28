import { stringParser } from '@rawmodel/parsers';
import { emailValidator, presenceValidator } from '@rawmodel/validators';
import { ModelBase, prop } from 'at-lib/dist/lib/base-models/base';
import { ValidatorErrorCode } from '../../../config/types';

export class CreateUserDto extends ModelBase {
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
