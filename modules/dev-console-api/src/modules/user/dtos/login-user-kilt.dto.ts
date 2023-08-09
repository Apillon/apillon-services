import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { ModelBase, PopulateFrom } from '@apillon/lib';
import { ValidatorErrorCode } from '../../../config/types';
import { prop } from '@rawmodel/core';

export class LoginUserKiltDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.USER_KILT_PRESENTATION_NOT_PRESENT,
      },
    ],
  })
  public token: string;
}
