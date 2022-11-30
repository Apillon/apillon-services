// import { ApiProperty } from '@babel/core';
import { prop } from '@rawmodel/core';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { ValidatorErrorCode } from '../../../config/types';
import { ModelBase } from '@apillon/lib/dist/lib/base-models/base';
import { DefaultUserRole, PopulateFrom } from '@apillon/lib';
import { projectUserRolesValidator } from '../validators/project-user-role.validator';

export class ProjectUserInviteDto extends ModelBase {
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

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.PROJECT_USER_ROLE_ID_NOT_PRESENT,
      },
      {
        resolver: projectUserRolesValidator(),
        code: ValidatorErrorCode.PROJECT_USER_ROLE_ID_NOT_VALID,
      },
      ,
    ],
  })
  public role_id: DefaultUserRole;
}