import { HttpStatus, Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../../context';
import { User } from '../../user/models/user.model';
import {
  Ams,
  CodeException,
  CreateOverrideDto,
  DeleteOverrideDto,
  Scs,
  UserLoginsQueryFilterDto,
  UserRolesQueryFilterDto,
} from '@apillon/lib';
import { ResourceNotFoundErrorCode } from '../../../config/types';
import { UserQueryFilter } from './dtos/user-query-filter.dto';
import { UUID } from 'crypto';
import { QuotaDto } from '@apillon/lib/dist/lib/at-services/config/dtos/quota.dto';
import { GetAllQuotasDto } from '@apillon/lib/dist/lib/at-services/config/dtos/get-all-quotas.dto';
import { UserProjectsQueryFilter } from './dtos/user-projects-query-filter.dto';

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
   * @returns {Promise<any>} The serialized user data.
   */
  async getUserList(
    context: DevConsoleApiContext,
    filter: UserQueryFilter,
  ): Promise<any> {
    return await new User({}, context).listAllUsers(filter);
  }

  /**
   * Retreives a list of all logins for a uer
   * @async
   * @param {DevConsoleApiContext} context
   * @param {UUID} user_uuid
   * @param {UserLoginsQueryFilterDto} query
   * @returns {Promise<any>}
   */
  async getUserLogins(
    context: DevConsoleApiContext,
    user_uuid: UUID,
    query: UserLoginsQueryFilterDto,
  ): Promise<any> {
    return (await new Ams(context).getUserLogins(user_uuid, query)).data;
  }

  /**
   * Retreives a list of the user's projects by user_uuid
   * @async
   * @param {DevConsoleApiContext} context
   * @param {UUID} user_uuid
   * @param {UserProjectsQueryFilter} query
   * @returns {Promise<any>}
   */
  async getUserProjects(
    context: DevConsoleApiContext,
    user_uuid: UUID,
    query: UserProjectsQueryFilter,
  ): Promise<any> {
    return await new User({}, context).listProjects(user_uuid, query);
  }

  /**
   * Retreives a list of all roles for a user that are not linked to a project
   * @async
   * @param {DevConsoleApiContext} context
   * @param {UUID} user_uuid
   * @param {UserRolesQueryFilterDto} query
   * @returns {Promise<any>}
   */
  async getUserRoles(
    context: DevConsoleApiContext,
    user_uuid: UUID,
    query: UserRolesQueryFilterDto,
  ): Promise<any> {
    return (await new Ams(context).getUserRoles(user_uuid, query)).data;
  }

  /**
   * Retreives a list of all quotas for a user
   * @async
   * @param {DevConsoleApiContext} context
   * @param {GetAllQuotasDto} query
   * @returns {Promise<QuotaDto[]>}
   */
  async getUserQuotas(
    context: DevConsoleApiContext,
    query: GetAllQuotasDto,
  ): Promise<QuotaDto[]> {
    return await new Scs(context).getAllQuotas(query);
  }

  /**
   * Creates or updates a user quota by user_uuid and quota_id
   * @param {DevConsoleApiContext} context
   * @param {CreateOverrideDto} dto - Create or Update data
   */
  async createUserQuota(
    context: DevConsoleApiContext,
    data: CreateOverrideDto,
  ) {
    return await new Scs(context).createOverride(data);
  }

  /**
   * Deletes user quota by user_uuid and quota_id
   * @param {DevConsoleApiContext} context
   * @param {DeleteOverrideDto} dto - Create or Update data
   */
  async deleteUserQuota(
    context: DevConsoleApiContext,
    data: DeleteOverrideDto,
  ) {
    return await new Scs(context).deleteOverride(data);
  }
}
