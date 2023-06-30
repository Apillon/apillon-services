// import { ApiProperty } from '@babel/core';
import { PopulateFrom } from '@apillon/lib';
import { ModelBase } from '@apillon/lib/dist/lib/base-models/base';
import { prop } from '@rawmodel/core';
import { stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { ValidatorErrorCode } from '../../../config/types';

export class ProjectUserUninviteDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.PROJECT_USER_EMAIL_NOT_PRESENT,
      },
    ],
  })
  public email: string;
}
