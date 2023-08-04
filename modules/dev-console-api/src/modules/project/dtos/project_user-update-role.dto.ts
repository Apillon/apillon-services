// import { ApiProperty } from '@babel/core';
import { prop } from '@rawmodel/core';
import { integerParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { ValidatorErrorCode } from '../../../config/types';
import { DefaultUserRole, ModelBase, PopulateFrom } from '@apillon/lib';
import { projectUserRolesValidator } from '../validators/project-user-role.validator';

export class ProjectUserUpdateRoleDto extends ModelBase {
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.UPDATE_ROLE_ON_PROJECT_ROLE_ID_NOT_PRESENT,
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
