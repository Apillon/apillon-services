import {
  DefaultUserRole,
  generateJwtToken,
  JwtTokenType,
  Lmas,
  LogType,
  parseJwtToken,
  PopulateFrom,
  SerializeFor,
  ServiceName,
  UserWalletAuthDto,
} from '@apillon/lib';
import { AmsErrorCode } from '../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import { AmsCodeException, AmsValidationException } from '../../lib/exceptions';
import { AuthToken } from '../auth-token/auth-token.model';
import { AuthUser } from './auth-user.model';

import { TokenExpiresInStr } from '../../config/types';
import { CryptoHash } from '../../lib/hash-with-crypto';
import { signatureVerify } from '@polkadot/util-crypto';

/**
 * AuthUserService class handles user authentication and related operations, such as registration, login, password reset, and email verification.
 */
export class AuthUserService {
  /**
   * Registers a new user with the provided email, password, and user_uuid.
   * @param event An object containing the user details.
   * @param context The ServiceContext instance for the current request.
   * @returns The newly registered user's data.
   */
  static async register(event, context: ServiceContext) {
    if (!event?.user_uuid || !event.password || !event.email) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.BAD_REQUEST,
      }).writeToMonitor({
        context,
        user_uuid: event?.user_uuid,
        data: event,
      });
    }
    //check if email already exists - user cannot register twice
    const checkEmailRes = await AuthUserService.emailExists(event, context);

    if (checkEmailRes.result === true) {
      throw new AmsCodeException({
        status: 400,
        code: AmsErrorCode.USER_ALREADY_REGISTERED,
      });
    }

    const authUser = new AuthUser({}, context);
    authUser.populate(event, PopulateFrom.SERVICE);

    authUser.setPassword(event.password);
    const conn = await context.mysql.start();

    try {
      await authUser.validate();
    } catch (err) {
      throw new AmsValidationException(authUser);
    }

    try {
      await authUser.insert(SerializeFor.INSERT_DB, conn);
      await authUser.setDefaultRole(conn);
      // Give beta roll to all new users
      await authUser.assignRole('', DefaultUserRole.BETA_USER, conn);

      // Generate a new token with type USER_AUTH
      authUser.token = generateJwtToken(JwtTokenType.USER_AUTHENTICATION, {
        user_uuid: authUser.user_uuid,
      });

      // Create new token in the database
      const authToken = new AuthToken({}, context);
      const tokenData = {
        tokenHash: await CryptoHash.hash(authUser.token),
        user_uuid: authUser.user_uuid,
        tokenType: JwtTokenType.USER_AUTHENTICATION,
        expiresIn: TokenExpiresInStr.EXPIRES_IN_1_DAY,
      };

      authToken.populate({ ...tokenData }, PopulateFrom.SERVICE);

      try {
        await authToken.validate();
      } catch (err) {
        console.log('Exception occurred when validating auth token - ', err);
        throw new AmsValidationException(authToken);
      }

      await authToken.insert(SerializeFor.INSERT_DB, conn);
      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);
      throw await new AmsCodeException({
        status: 500,
        code: AmsErrorCode.ERROR_WRITING_TO_DATABASE,
      }).writeToMonitor({ context, user_uuid: event?.user_uuid, data: event });
    }

    await new Lmas().writeLog({
      context,
      logType: LogType.INFO,
      message: 'New User Registration!',
      user_uuid: authUser.user_uuid,
      location: 'AMS/UserService/register',
      service: ServiceName.AMS,
    });

    const res = authUser.serialize(SerializeFor.SERVICE);
    console.log(res);
    return res;
  }
  /**
   * Authenticates a user using their email and password.
   * @param event An object containing the user's email and password.
   * @param context The ServiceContext instance for the current request.
   * @returns The authenticated user's data.
   */
  static async login(event, context: ServiceContext) {
    const authUser = await new AuthUser({}, context).populateByEmail(
      event.email,
    );
    if (!authUser.exists() || !authUser.verifyPassword(event.password)) {
      throw await new AmsCodeException({
        status: 401,
        code: AmsErrorCode.USER_IS_NOT_AUTHENTICATED,
      }).writeToMonitor({ context, user_uuid: event?.user_uuid, data: event });
    }

    await authUser.loginUser();

    await new Lmas().writeLog({
      context,
      logType: LogType.INFO,
      message: 'User login',
      location: 'AMS/UserService/login',
      user_uuid: authUser.user_uuid,
      service: ServiceName.AMS,
    });

    return authUser.serialize(SerializeFor.SERVICE);
  }
  /**
   * Retrieves an authenticated user's data using their token.
   * @param event An object containing the user's token.
   * @param context The ServiceContext instance for the current request.
   * @returns The authenticated user's data.
   */
  static async getAuthUser(event, context: ServiceContext) {
    // send log to monitoring service
    // await new Lmas().writeLog(
    //   {
    //     logType: LogType.INFO,
    //     message: 'User auth has been called!',
    //     location: 'AMS/UserService/isAuthenticated',
    //   },
    //   'secToken1',
    // );

    if (!event.token) {
      throw await new AmsCodeException({
        status: 422,
        code: AmsErrorCode.USER_AUTH_TOKEN_NOT_PRESENT,
      }).writeToMonitor({
        context,
        user_uuid: event?.user_uuid,
        data: event,
      });
    }

    const tokenData = parseJwtToken(
      JwtTokenType.USER_AUTHENTICATION,
      event.token,
    );

    if (!tokenData.user_uuid) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.USER_AUTH_TOKEN_IS_INVALID,
      }).writeToMonitor({
        context,
        user_uuid: event?.user_uuid,
        data: event,
      });
    }
    const authUser = await new AuthUser({}, context).populateByUserUuid(
      tokenData.user_uuid,
    );

    if (!authUser.exists()) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.USER_DOES_NOT_EXISTS,
      }).writeToMonitor({
        context,
        user_uuid: event?.user_uuid,
        data: event,
      });
    }

    // Find old token
    const authToken = await new AuthToken({}, context).populateByUserAndType(
      tokenData.user_uuid,
      JwtTokenType.USER_AUTHENTICATION,
    );

    if (
      !authToken.exists() ||
      !(await CryptoHash.verify(event.token, authToken.tokenHash))
    ) {
      throw await new AmsCodeException({
        status: 401,
        code: AmsErrorCode.USER_IS_NOT_AUTHENTICATED,
      }).writeToMonitor({
        context,
        user_uuid: event?.user_uuid,
        data: event,
      });
    }

    authUser.token = event.token;

    return authUser.serialize(SerializeFor.SERVICE);
  }
  /**
   * Updates an authenticated user's data with the provided information.
   * @param event An object containing the user's updated data.
   * @param context The ServiceContext instance for the current request.
   * @returns The updated user's data.
   */
  static async updateAuthUser(event, context: ServiceContext) {
    const authUser = await new AuthUser({}, context).populateByUserUuid(
      event.user_uuid,
    );

    if (!authUser.exists()) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.USER_DOES_NOT_EXISTS,
      }).writeToMonitor({
        context,
        user_uuid: event?.user_uuid,
        data: event,
      });
    }

    authUser.populate(event, PopulateFrom.SERVICE);
    try {
      await authUser.validate();
    } catch (err) {
      throw new AmsValidationException(authUser);
    }
    try {
      await authUser.update();
    } catch (err) {
      throw await new AmsCodeException({
        status: 500,
        code: AmsErrorCode.ERROR_WRITING_TO_DATABASE,
      }).writeToMonitor({
        context,
        user_uuid: event?.user_uuid,
        data: event,
      });
    }

    // send log to monitoring service
    await new Lmas().writeLog({
      context,
      logType: LogType.INFO,
      message: 'AuthUser updated!',
      location: 'AMS/UserService/updateAuthUser',
      service: ServiceName.AMS,
    });

    return authUser.serialize(SerializeFor.SERVICE);
  }
  /**
   * Resets a user's password using their email and new password.
   * @param event An object containing the user's email and new password.
   * @param context The ServiceContext instance for the current request.
   * @returns A boolean value indicating whether the password reset was successful.
   */
  static async resetPassword(event, context: ServiceContext) {
    if (!event?.email || !event.password) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.BAD_REQUEST,
      }).writeToMonitor({ context, user_uuid: event?.user_uuid, data: event });
    }

    const authUser = await new AuthUser({}, context).populateByEmail(
      event.email,
    );

    if (!authUser.exists()) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.USER_DOES_NOT_EXISTS,
      }).writeToMonitor({ context, user_uuid: event?.user_uuid, data: event });
    }

    authUser.setPassword(event.password);
    try {
      await authUser.validate();
    } catch (err) {
      throw new AmsValidationException(authUser);
    }

    try {
      await authUser.update();
    } catch (err) {
      throw await new AmsCodeException({
        status: 500,
        code: AmsErrorCode.ERROR_WRITING_TO_DATABASE,
      }).writeToMonitor({ context, user_uuid: event?.user_uuid, data: event });
    }

    return true;
  }
  /**
   * Checks if an email address is already associated with an existing user.
   * @param event An object containing the user's email.
   * @param context The ServiceContext instance for the current request.
   * @returns An object with a boolean result indicating whether the email exists.
   */
  static async emailExists(event, context: ServiceContext) {
    if (!event?.email) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.BAD_REQUEST,
      }).writeToMonitor({
        context,
        user_uuid: event?.user_uuid,
        data: event,
      });
    }

    const authUser = await new AuthUser({}, context).populateByEmail(
      event.email,
    );

    return { result: authUser.exists() };
  }
  /**
   * Retrieves an authenticated user's data using their email.
   * @param event An object containing the user's email.
   * @param context The ServiceContext instance for the current request.
   * @returns The authenticated user's data.
   */
  static async getAuthUserByEmail(event, context: ServiceContext) {
    if (!event?.email) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.BAD_REQUEST,
      }).writeToMonitor({
        context,
        user_uuid: event?.user_uuid,
        data: event,
      });
    }

    const authUser = await new AuthUser({}, context).populateByEmail(
      event.email,
    );

    return authUser.serialize(SerializeFor.SERVICE);
  }
  /**
   * Authenticates a user using their wallet address.
   * @param event An object containing the user's wallet address.
   * @param context The ServiceContext instance for the current request.
   * @returns The authenticated user's data.
   */
  static async loginWithWalletAddress(event, context: ServiceContext) {
    const authData = new UserWalletAuthDto(event.authData);

    try {
      await authData.validate();
    } catch (err) {
      throw new AmsValidationException(authData);
    }

    if (!event?.message) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.BAD_REQUEST,
      }).writeToMonitor({
        context,
        user_uuid: event?.user_uuid,
        data: event,
      });
    }

    const { isValid } = signatureVerify(
      event.message,
      authData.signature,
      authData.wallet,
    );

    if (!isValid) {
      throw await new AmsCodeException({
        status: 401,
        code: AmsErrorCode.USER_IS_NOT_AUTHENTICATED,
      }).writeToMonitor({
        context,
        user_uuid: event?.user_uuid,
        data: event,
      });
    }

    const authUser = await new AuthUser({}, context).populateByWalletAddress(
      authData.wallet,
    );

    if (!authUser.exists()) {
      throw await new AmsCodeException({
        status: 401,
        code: AmsErrorCode.USER_IS_NOT_AUTHENTICATED,
      }).writeToMonitor({ context, user_uuid: event?.user_uuid, data: event });
    }

    await authUser.loginUser();

    await new Lmas().writeLog({
      context,
      logType: LogType.INFO,
      message: 'User login',
      location: 'AMS/UserService/loginWithWalletAddress',
      user_uuid: authUser.user_uuid,
      service: ServiceName.AMS,
    });

    return authUser.serialize(SerializeFor.SERVICE);
  }
}
