import { DefaultUserRole, ForbiddenErrorCodes } from '../../config/types';
import { Context } from '../context';
import { CodeException } from '../exceptions/exceptions';
import { AdvancedSQLModel } from './advanced-sql.model';

/**
 * Class which contains access control methods for a project.
 * Contains canAccess and canModify methods which check if a project can be accessed and/or modified.
 * @abstract
 * @class ProjectAccessModel
 * @typedef {ProjectAccessModel}
 * @extends {AdvancedSQLModel}
 */
export abstract class ProjectAccessModel extends AdvancedSQLModel {
  /**
   * Method which checks if a project can be accessed depending on the user role.
   * project_uuid is optional if the inheriting class defines that property
   * @param {Context} context
   * @param {string} [project_uuid=null]
   * @returns {boolean}
   */
  public canAccess(context: Context, project_uuid: string = null): boolean {
    // Admins are allowed to access items on any project
    if (context.user?.userRoles.includes(DefaultUserRole.ADMIN)) {
      return true;
    }

    if (this['project_uuid']) {
      project_uuid = this['project_uuid'];
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
        status: 403,
        errorMessage: 'Insufficient permissions to access this record',
      });
    }
  }

  /**
   * Method which checks if a project can be modified depending on the user role.
   * project_uuid is optional if the inheriting class defines that property
   * @param {Context} context
   * @param {string} [project_uuid=null]
   * @returns {boolean}
   */
  public canModify(context: Context, project_uuid: string = null): boolean {
    if (this['project_uuid']) {
      project_uuid = this['project_uuid'];
    }
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
        status: 403,
        errorMessage: 'Insufficient permissions to modify this record',
      });
    }
    return true;
  }
}
