import { faker } from '@faker-js/faker';
import { stringParser } from '@rawmodel/parsers';
import { emailValidator, presenceValidator } from '@rawmodel/validators';
import { PopulateFrom } from '@apillon/lib';
import { ModelBase, prop } from '@apillon/lib/dist/lib/base-models/base';
import { ValidatorErrorCode } from '../../../config/types';

export class CreateUserDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.USER_EMAIL_NOT_PRESENT,
      },
      {
        resolver: emailValidator(),
        code: ValidatorErrorCode.USER_EMAIL_NOT_VALID,
      },
    ],
    fakeValue: () => faker.internet.email(),
  })
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
    fakeValue: () => faker.internet.password(),
  })
  public password: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    fakeValue: () => faker.random.alphaNumeric(32),
  })
  public wallet: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    fakeValue: () => faker.internet.userName(),
  })
  public name: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    fakeValue: () => faker.phone.number(),
  })
  public phone: string;
}
