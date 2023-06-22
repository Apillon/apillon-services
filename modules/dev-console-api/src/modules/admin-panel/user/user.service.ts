import { HttpStatus, Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../../context';
import { User } from '../../user/models/user.model';
import { CodeException, SerializeFor } from '@apillon/lib';
import { ResourceNotFoundErrorCode } from '../../../config/types';

@Injectable()
export class UserService {
  /**
   * Retrieves the user information.
   * @param {DevConsoleApiContext} context - The API context with current user session.
   * @param {string} uuid - The user's uuid.
   * @returns {Promise<any>} The serialized user data.
   */
  async getUser(context: DevConsoleApiContext, uuid: string): Promise<any> {
    const user = await new User({}, context).populateByUUID(uuid);

    if (!user.exists) {
      throw new CodeException({
        status: HttpStatus.UNAUTHORIZED,
        code: ResourceNotFoundErrorCode.USER_DOES_NOT_EXISTS,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    user.userRoles = context.user.userRoles;
    user.userPermissions = context.user.userPermissions;
    user.wallet = context.user.authUser.wallet;

    return user.serialize(SerializeFor.ADMIN);
  }

  /**
   * Retrieves a list of all users
   * @param {DevConsoleApiContext} context - The API context with current user session.
   * @returns {Promise<any>} The serialized user data.
   */
  async getUserList(context: DevConsoleApiContext, filter): Promise<any> {
    return await new User({}, context).listUsers(context, filter);
  }
}
