import { DefaultUserRole, ForbiddenErrorCodes } from '../../config/types';
import { Context } from '../context';
import { CodeException } from '../exceptions/exceptions';
import { AdvancedSQLModel } from './advanced-sql.model';
import { HttpStatus } from '@nestjs/common';

export abstract class ProjectAccessModel extends AdvancedSQLModel {
  public project_uuid: string;

  public canAccess(
    context: Context,
    project_uuid = this.project_uuid,
  ): boolean | Promise<boolean> {
    // Admins are allowed to access items on any project
    if (context.user.userRoles.includes(DefaultUserRole.ADMIN)) {
      return true;
    }
    if (
      !context.hasRoleOnProject(
        [
          DefaultUserRole.PROJECT_OWNER,
          DefaultUserRole.PROJECT_ADMIN,
          DefaultUserRole.PROJECT_USER,
          DefaultUserRole.ADMIN,
        ],
        project_uuid,
      )
    ) {
      throw new CodeException({
        code: ForbiddenErrorCodes.FORBIDDEN,
        status: HttpStatus.FORBIDDEN,
        errorMessage: 'Insufficient permissions to access this record',
      });
    }
  }

  public canModify(
    context: Context,
    project_uuid = this.project_uuid,
  ): boolean | Promise<boolean> {
    if (
      !context.hasRoleOnProject(
        [
          DefaultUserRole.PROJECT_ADMIN,
          DefaultUserRole.PROJECT_OWNER,
          DefaultUserRole.ADMIN,
        ],
        project_uuid,
      )
    ) {
      throw new CodeException({
        code: ForbiddenErrorCodes.FORBIDDEN,
        status: HttpStatus.FORBIDDEN,
        errorMessage: 'Insufficient permissions to modify this record',
      });
    }
    return true;
  }
}
