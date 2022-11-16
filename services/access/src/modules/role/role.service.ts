import { ApiKeyRoleDto, SerializeFor } from '@apillon/lib';
import { AmsErrorCode } from '../../config/types';
import { AmsCodeException, AmsValidationException } from '../../lib/exceptions';
import { ApiKey } from '../api-key/models/api-key.model';
import { AuthUser } from '../auth-user/auth-user.model';
import { ApiKeyRole } from './models/api-key-role.model';

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

  static async assignRoleToApiKey(event: { body: ApiKeyRoleDto }, context) {
    const key: ApiKey = await new ApiKey({}, context).populateById(
      event.body.apiKey_id,
    );

    if (!key.exists()) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.API_KEY_NOT_FOUND,
      }).writeToMonitor({
        userId: context?.user?.user_uuid,
        projectId: event?.body?.project_uuid,
      });
    }

    key.canModify(context);

    const keyRole: ApiKeyRole = new ApiKeyRole(event.body, context);

    try {
      await keyRole.validate();
    } catch (err) {
      await keyRole.handle(err);
      if (!keyRole.isValid()) throw new AmsValidationException(keyRole);
    }

    //Check if role already assigned
    if (!(await keyRole.roleAlreadyAssigned())) await keyRole.insert();

    return keyRole.serialize(SerializeFor.SERVICE);
  }

  static async removeApiKeyRole(event: { body: ApiKeyRoleDto }, context) {
    const key: ApiKey = await new ApiKey({}, context).populateById(
      event.body.apiKey_id,
    );

    if (!key.exists()) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.API_KEY_NOT_FOUND,
      }).writeToMonitor({
        userId: context?.user?.user_uuid,
        projectId: event?.body?.project_uuid,
      });
    }

    key.canModify(context);

    await new ApiKeyRole({}, context).deleteApiKeyRole(event.body);

    return true;
  }

  static async getApiKeyRoles(event: { apiKey_id: number }, context) {
    const key: ApiKey = await new ApiKey({}, context).populateById(
      event.apiKey_id,
    );

    if (!key.exists()) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.API_KEY_NOT_FOUND,
      }).writeToMonitor({
        userId: context?.user?.user_uuid,
      });
    }

    key.canAccess(context);

    return await new ApiKeyRole({}, context).getApiKeyRoles(event.apiKey_id);
  }
}
