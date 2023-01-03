import { ApiKeyRoleBaseDto, SerializeFor } from '@apillon/lib';
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
        context,
        project_uuid: event?.project_uuid,
        data: event,
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
        context,
        project_uuid: event?.project_uuid,
        data: event,
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
        context,
        project_uuid: event?.project_uuid,
        data: event,
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
        context,
        project_uuid: event?.project_uuid,
        data: event,
      });
    }

    await authUser.removeRole(event.project_uuid, event.role_id);

    return authUser.serialize(SerializeFor.SERVICE);
  }

  static async assignRoleToApiKey(
    event: { apiKey_id: number; body: ApiKeyRoleBaseDto },
    context,
  ) {
    const key: ApiKey = await new ApiKey({}, context).populateById(
      event.apiKey_id,
    );

    if (!key.exists()) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.API_KEY_NOT_FOUND,
      }).writeToMonitor({
        context,
        data: event,
      });
    }

    key.canModify(context);

    return await key.assignRole(event.body);
  }

  static async removeApiKeyRole(
    event: { apiKey_id: number; body: ApiKeyRoleBaseDto },
    context,
  ) {
    const key: ApiKey = await new ApiKey({}, context).populateById(
      event.apiKey_id,
    );

    if (!key.exists()) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.API_KEY_NOT_FOUND,
      }).writeToMonitor({
        context,
        data: event,
      });
    }

    key.canModify(context);

    return await key.removeRole(event.body);
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
        context,
        data: event,
      });
    }

    key.canAccess(context);

    return await new ApiKeyRole({}, context).getApiKeyRoles(event.apiKey_id);
  }
}
