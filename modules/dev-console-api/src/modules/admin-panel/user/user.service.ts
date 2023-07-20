import { HttpStatus, Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../../context';
import { User } from '../../user/models/user.model';
import {
  Ams,
  BaseQueryFilter,
  CodeException,
  CreateQuotaOverrideDto,
  DefaultUserRole,
  QuotaOverrideDto,
  Scs,
} from '@apillon/lib';
import { ResourceNotFoundErrorCode } from '../../../config/types';
import { UUID } from 'crypto';
import { QuotaDto } from '@apillon/lib/dist/lib/at-services/config/dtos/quota.dto';
import { GetQuotasDto } from '@apillon/lib/dist/lib/at-services/config/dtos/get-quotas.dto';

@Injectable()
export class UserService {
  /**
   * Retrieves the user information.
   * @param {DevConsoleApiContext} context - The API context with current user session.
   * @param {UUID} user_uuid - The user's uuid.
   * @returns {Promise<User>} The serialized user data.
   */
  async getUser(context: DevConsoleApiContext, user_uuid: UUID): Promise<User> {
    const user = await new User({}, context).getUserDetail(user_uuid);

    if (!user?.id) {
      throw new CodeException({
        status: HttpStatus.NOT_FOUND,
        code: ResourceNotFoundErrorCode.USER_DOES_NOT_EXISTS,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    return user;
  }

  /**
   * Retrieves a list of all users
   * @param {DevConsoleApiContext} context - The API context with current user session.
   * @param {BaseQueryFilter} filter - The query filter data
   * @returns {Promise<any>} The serialized user data.
   */
  async getUserList(
    context: DevConsoleApiContext,
    filter: BaseQueryFilter,
  ): Promise<any> {
    return await new User({}, context).listUsers(filter);
  }

  /**
   * Retreives a list of all logins for a uer
   * @async
   * @param {DevConsoleApiContext} context
   * @param {UUID} user_uuid
   * @param {BaseQueryFilter} query
   * @returns {Promise<any>}
   */
  async getUserLogins(
    context: DevConsoleApiContext,
    user_uuid: UUID,
    query: BaseQueryFilter,
  ): Promise<any> {
    return (await new Ams(context).getUserLogins(user_uuid, query)).data;
  }

  /**
   * Retreives a list of the user's projects by user_uuid
   * @async
   * @param {DevConsoleApiContext} context
   * @param {UUID} user_uuid
   * @param {BaseQueryFilter} query
   * @returns {Promise<any>}
   */
  async getUserProjects(
    context: DevConsoleApiContext,
    user_uuid: UUID,
    query: BaseQueryFilter,
  ): Promise<any> {
    return await new User({}, context).listProjects(user_uuid, query);
  }

  /**
   * Retreives a list of all roles for a user that are not linked to a project
   * @async
   * @param {DevConsoleApiContext} context
   * @param {UUID} user_uuid
   * @param {BaseQueryFilter} query
   * @returns {Promise<any>}
   */
  async getUserRoles(
    context: DevConsoleApiContext,
    user_uuid: UUID,
    query: BaseQueryFilter,
  ): Promise<any> {
    return (await new Ams(context).getUserRoles(user_uuid, query)).data;
  }

  /**
   * Add a role to a user
   * @async
   * @param {DevConsoleApiContext} context
   * @param {{ user_uuid: UUID; role_id: DefaultUserRole; }} data
   */
  async addUserRole(
    context: DevConsoleApiContext,
    data: {
      user_uuid: UUID;
      role_id: DefaultUserRole;
    },
  ) {
    return (await new Ams(context).assignUserRole(data)).data;
  }

  /**
   * Remove a role from a user
   * @async
   * @param {DevConsoleApiContext} context
   * @param {{ user_uuid: UUID; role_id: DefaultUserRole; }} data
   */
  async removeUserRole(
    context: DevConsoleApiContext,
    data: {
      user_uuid: UUID;
      role_id: DefaultUserRole;
    },
  ) {
    return (await new Ams(context).removeUserRole(data)).data;
  }

  /**
   * Retreives a list of all quotas for a user
   * @async
   * @param {DevConsoleApiContext} context
   * @param {GetQuotasDto} query
   * @returns {Promise<QuotaDto[]>}
   */
  async getUserQuotas(
    context: DevConsoleApiContext,
    query: GetQuotasDto,
  ): Promise<QuotaDto[]> {
    return await new Scs(context).getQuotas(query);
  }

  /**
   * Creates or updates a user quota by user_uuid and quota_id
   * @param {DevConsoleApiContext} context
   * @param {CreateQuotaOverrideDto} dto - Create or Update data
   */
  async createUserQuota(
    context: DevConsoleApiContext,
    data: CreateQuotaOverrideDto,
  ) {
    return (await new Scs(context).createOverride(data)).data;
  }

  /**
   * Deletes user quota by user_uuid and quota_id
   * @param {DevConsoleApiContext} context
   * @param {QuotaOverrideDto} dto - Create or Update data
   */
  async deleteUserQuota(context: DevConsoleApiContext, data: QuotaOverrideDto) {
    return await new Scs(context).deleteOverride(data);
  }
}
