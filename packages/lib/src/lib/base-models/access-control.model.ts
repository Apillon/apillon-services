import { DefaultUserRole, ForbiddenErrorCodes } from '../../config/types';
import { Context } from '../context';
import { CodeException } from '../exceptions/exceptions';
import { AdvancedSQLModel } from './advanced-sql.model';
import { HttpStatus } from '@nestjs/common';

export abstract class AccessControlModel extends AdvancedSQLModel {
  public abstract project_uuid: string;

  public canAccess(context: Context) {
    if (
      !context.hasRoleOnProject(
        [
          DefaultUserRole.PROJECT_OWNER,
          DefaultUserRole.PROJECT_ADMIN,
          DefaultUserRole.PROJECT_USER,
          DefaultUserRole.ADMIN,
        ],
        this.project_uuid,
      )
    ) {
      throw new CodeException({
        code: ForbiddenErrorCodes.FORBIDDEN,
        status: HttpStatus.FORBIDDEN,
        errorMessage: 'Insufficient permissions to access this record',
      });
    }
  }

  public canModify(context: Context) {
    if (
      !context.hasRoleOnProject(
        [
          DefaultUserRole.PROJECT_ADMIN,
          DefaultUserRole.PROJECT_OWNER,
          DefaultUserRole.ADMIN,
        ],
        this.project_uuid,
      )
    ) {
      throw new CodeException({
        code: ForbiddenErrorCodes.FORBIDDEN,
        status: HttpStatus.FORBIDDEN,
        errorMessage: 'Insufficient permissions to modify this record',
      });
    }
  }
}
