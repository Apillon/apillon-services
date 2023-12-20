import {
  ApiKeyRoleDto,
  CacheKeyPrefix,
  DefaultUserRole,
  LogType,
  SerializeFor,
  invalidateCacheKey,
} from '@apillon/lib';
import { AmsErrorCode, DbTables } from '../../config/types';
import { AmsBadRequestException, AmsCodeException } from '../../lib/exceptions';
import { AuthUser } from '../auth-user/auth-user.model';
import { ApiKeyRole } from './models/api-key-role.model';
import { ServiceContext } from '@apillon/service-lib';
import { ApiKeyService } from '../api-key/api-key.service';

/**
 * RoleService class for handling user and API key roles in a project.
 */
export class RoleService {
  /**
   * Assign a user role. Use event.project_uuid to assign role to a specific project
   * @param {any} event - The data needed to assign a user role
   * @param {any} context - The service context for database access.
   * @returns {Promise<any>} - A serialized AuthUser for service response.
   */
  static async assignUserRole(event, context) {
    if (!event?.user_uuid || !event.role_id) {
      throw await new AmsBadRequestException(context, event).writeToMonitor();
    }

    const authUser = await new AuthUser({}, context).populateByUserUuid(
      event.user_uuid,
    );

    if (!authUser.exists()) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.USER_DOES_NOT_EXISTS,
      }).writeToMonitor({
        logType: LogType.WARN,
        context,
        project_uuid: event?.project_uuid,
        data: event,
      });
    }

    await authUser.assignRole(event.project_uuid, event.role_id);

    return authUser.serialize(SerializeFor.SERVICE);
  }

  /**
   * Remove a user role from a specific project. Use event.project_uuid to remove roles from a specific project only
   * @param {any} event - The data needed to remove a user role.
   * @param {any} context - The service context for database access.
   * @returns {Promise<any>} - A serialized AuthUser for service response.
   */
  static async removeUserRole(event, context) {
    if (!event?.user_uuid || !event.role_id) {
      throw await new AmsBadRequestException(context, event).writeToMonitor();
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

  /**
   * Assign a role to an API key.
   * @param {{ body: ApiKeyRoleDto }} event - The data needed to assign a role to an API key.
   * @param {any} context - The service context for database access.
   * @returns {Promise<any>} - The result of the role assignment operation.
   */
  static async assignRoleToApiKey(
    event: { body: ApiKeyRoleDto },
    context: ServiceContext,
  ) {
    const key = await ApiKeyService.getApiKeyById(
      event.body.apiKey_id,
      context,
    );
    key.canModify(context);

    const result = await key.assignRole(event.body);
    await invalidateCacheKey(`${CacheKeyPrefix.AUTH_USER_DATA}:${key.apiKey}`);

    return result;
  }

  /**
   * Remove a role from an API key.
   * @param {{ body: ApiKeyRoleDto }} event - The data needed to remove a role from an API key.
   * @param {any} context - The service context for database access.
   * @returns {Promise<any>} - The result of the role removal operation.
   */
  static async removeApiKeyRole(
    event: { body: ApiKeyRoleDto },
    context: ServiceContext,
  ) {
    const key = await ApiKeyService.getApiKeyById(
      event.body.apiKey_id,
      context,
    );
    key.canModify(context);

    const result = await key.removeRole(event.body);
    await invalidateCacheKey(`${CacheKeyPrefix.AUTH_USER_DATA}:${key.apiKey}`);

    return result;
  }

  /**
   * Remove roles from an API key based on the service uuid
   * @param {{ body: ApiKeyRoleDto }} event - The data needed to remove a role from an API key.
   * @param {any} context - The service context for database access.
   * @returns {Promise<any>} - The result of the role removal operation.
   */
  static async removeApiKeyRolesByService(
    event: { body: ApiKeyRoleDto },
    context: ServiceContext,
  ) {
    const key = await ApiKeyService.getApiKeyById(
      event.body.apiKey_id,
      context,
    );
    key.canModify(context);

    const result = await key.removeRolesByService(event.body);
    await invalidateCacheKey(`${CacheKeyPrefix.AUTH_USER_DATA}:${key.apiKey}`);

    return result;
  }

  /**
   * Get all roles assigned to an API key.
   * @param {{ apiKey_id: number }} event - The data needed to get roles assigned to an API key.
   * @param {any} context - The service context for database access.
   * @returns {Promise<any[]>} - An array of roles assigned to the API key.
   */
  static async getApiKeyRoles(event: { apiKey_id: number }, context) {
    const key = await ApiKeyService.getApiKeyById(event.apiKey_id, context);
    key.canAccess(context);

    return await new ApiKeyRole({}, context).getApiKeyRoles(event.apiKey_id);
  }

  /**
   * Return AuthUser which has owner permission on given project
   * @param event
   * @param context
   * @returns
   */
  static async getProjectOwner(
    event: { project_uuid: string },
    context: ServiceContext,
  ) {
    const data = await context.mysql.paramExecute(
      `
      SELECT au.*
      FROM \`${DbTables.AUTH_USER_ROLE}\` aur
      JOIN \`${DbTables.AUTH_USER}\` au ON au.id = aur.authUser_id
      WHERE aur.project_uuid = @project_uuid
      AND aur.role_id = ${DefaultUserRole.PROJECT_OWNER}
      LIMIT 1;
    `,
      { project_uuid: event.project_uuid },
    );

    return new AuthUser(data.length ? data[0] : {}, context).serialize();
  }
}
