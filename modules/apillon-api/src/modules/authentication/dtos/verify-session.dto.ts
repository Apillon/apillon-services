import { ModelBase, PopulateFrom, ValidatorErrorCode } from '@apillon/lib';
import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';

export class VerifySessionDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.AUTH_SESSION_TOKEN_NOT_PRESENT,
      },
    ],
  })
  public token: string;
}
