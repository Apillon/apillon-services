import { SerializeFor } from '@apillon/lib';
import { AmsErrorCode } from '../../config/types';
import { AmsCodeException } from '../../lib/exceptions';
import { AuthUser } from '../auth-user/auth-user.model';

export class RoleService {
  static async assignUserRoleOnProject(event, context) {
    if (!event?.user_uuid || !event.project_uuid || !event.role_id) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.BAD_REQUEST,
      }).writeToMonitor({
        userId: event?.user_uuid,
        projectId: event?.project_uuid,
      });
    }

    const authUser = await new AuthUser({}, context).populateByUserUuid(
      event.user_uuid,
    );

    if (!authUser.exists()) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.USER_DOES_NOT_EXISTS,
      }).writeToMonitor({
        userId: event?.user_uuid,
        projectId: event?.project_uuid,
      });
    }

    await authUser.assignRole(event.project_uuid, event.role_id);

    return authUser.serialize(SerializeFor.SERVICE);
  }

  static async removeUserRoleOnProject(event, context) {
    if (!event?.user_uuid || !event.project_uuid || !event.role_id) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.BAD_REQUEST,
      }).writeToMonitor({
        userId: event?.user_uuid,
        projectId: event?.project_uuid,
      });
    }

    const authUser = await new AuthUser({}, context).populateByUserUuid(
      event.user_uuid,
    );

    if (!authUser.exists()) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.USER_DOES_NOT_EXISTS,
      }).writeToMonitor({
        userId: event?.user_uuid,
        projectId: event?.project_uuid,
      });
    }

    await authUser.removeRole(event.project_uuid, event.role_id);

    return authUser.serialize(SerializeFor.SERVICE);
  }
}
