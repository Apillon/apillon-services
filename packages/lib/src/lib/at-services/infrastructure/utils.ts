import { DefaultUserRole } from '../../../config/types';
import { Context } from '../../context';

export function hasProjectAccess(projectUuid: string, context: Context) {
  return context.hasRoleOnProject(
    [
      DefaultUserRole.PROJECT_ADMIN,
      DefaultUserRole.PROJECT_OWNER,
      DefaultUserRole.PROJECT_USER,
    ],
    projectUuid,
  );
}
