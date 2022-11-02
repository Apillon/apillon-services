// import { ApiProperty } from '@babel/core';
import { prop } from '@rawmodel/core';
import { integerParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { ValidatorErrorCode } from '../../../config/types';
import { ModelBase } from 'at-lib/dist/lib/base-models/base';
import { PopulateFrom } from 'at-lib';

export class ProjectUserInviteDto extends ModelBase {
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.PROJECT_USER_PROJECT_ID_NOT_PRESENT,
      },
    ],
  })
  public project_id: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.PROJECT_USER_EMAIL_NOT_PRESENT,
      },
    ],
  })
  public email: string;

  // TODO: Currently unused
  //   @prop({
  //     parser: { resolver: integerParser() },
  //     validators: [
  //       {
  //         resolver: presenceValidator(),
  //         code: ValidatorErrorCode.PROJECT_USER_USER_ID_NOT_PRESENT,
  //       },
  //     ],
  //   })
  //   public role: string;
}
