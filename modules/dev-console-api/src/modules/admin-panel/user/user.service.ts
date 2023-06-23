import { HttpStatus, Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../../context';
import { User } from '../../user/models/user.model';
import { Ams, CodeException, UserLoginsQueryFilterDto } from '@apillon/lib';
import { ResourceNotFoundErrorCode } from '../../../config/types';
import { UserQueryFilter } from './dtos/user-query-filter.dto';

@Injectable()
export class UserService {
  /**
   * Retrieves the user information.
   * @param {DevConsoleApiContext} context - The API context with current user session.
   * @param {string} uuid - The user's uuid.
   * @returns {Promise<any>} The serialized user data.
   */
  async getUser(context: DevConsoleApiContext, uuid: string): Promise<any> {
    const user = await new User({}, context).getUserDetail(uuid);

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

  async getUserLogins(
    context: DevConsoleApiContext,
    uuid: string,
    query: UserLoginsQueryFilterDto,
  ): Promise<any> {
    return (await new Ams(context).getUserLogins(uuid, query)).data;
  }
}
