import {
  BaseQueryFilter,
  decodeJwtToken,
  generateJwtToken,
  JwtTokenType,
  Lmas,
  LogType,
  parseJwtToken,
  PopulateFrom,
  SerializeFor,
  ServiceName,
  UserWalletAuthDto,
  SqlModelStatus,
  env,
  CacheKeyPrefix,
  JwtExpireTime,
  invalidateCacheMatch,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { AmsErrorCode } from '../../config/types';
import {
  AmsBadRequestException,
  AmsCodeException,
  AmsValidationException,
} from '../../lib/exceptions';
import { AuthToken } from '../auth-token/auth-token.model';
import { AuthUser } from './auth-user.model';
import { CryptoHash } from '../../lib/hash-with-crypto';
import { ApiKeyService } from '../api-key/api-key.service';

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
        status: 500,
        code: AmsErrorCode.INVALID_EVENT_DATA,
      }).writeToMonitor({ data: event });
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

    await authUser.validateOrThrow(AmsValidationException);

    try {
      await authUser.insert(SerializeFor.INSERT_DB, conn);
      await authUser.setDefaultRole(conn);

      // Give beta roll to all new users
      // await authUser.assignRole('', DefaultUserRole.BETA_USER, conn);

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
        expiresIn: JwtExpireTime.ONE_DAY,
      };

      authToken.populate({ ...tokenData }, PopulateFrom.SERVICE);

      await authToken.validateOrThrow(AmsValidationException);

      await authToken.insert(SerializeFor.INSERT_DB, conn);
      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);
      throw await new AmsCodeException({
        status: 500,
        code: AmsErrorCode.ERROR_WRITING_TO_DATABASE,
      }).writeToMonitor({
        context,
        user_uuid: event?.user_uuid,
        data: { event, authUser: authUser.serialize(), err },
      });
    }

    await new Lmas().writeLog({
      context,
      logType: LogType.INFO,
      message: 'New User Registration!',
      user_uuid: authUser.user_uuid,
      location: 'AMS/UserService/register',
      service: ServiceName.AMS,
    });

    return authUser.serialize(SerializeFor.SERVICE);
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
      }).writeToMonitor({
        logType: LogType.WARN,
        context,
        user_uuid: event?.user_uuid,
        data: event,
      });
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
   * Authenticates a user using their email and password.
   * @param event An object containing the user's email and password.
   * @param context The ServiceContext instance for the current request.
   * @returns The authenticated user's data.
   */
  static async loginWithKilt(event, context: ServiceContext) {
    // Parse received token - trigger exception if this token
    // does not belong to us
    let tokenData;
    try {
      tokenData = parseJwtToken(JwtTokenType.OAUTH_TOKEN, event.token);
      // This API key was used to generate an OAuth session token (JwtTokenType.AUTH_SESSION)
      // So we need to check if the same project_uuid is used to call this method
      // Without this check anybody with a valid OAuth token can call this method and log in to Apillon
      const apiKey = await ApiKeyService.getApiKey(
        {
          apiKey: env.APILLON_API_INTEGRATION_API_KEY,
          apiKeySecret: env.APILLON_API_INTEGRATION_API_SECRET,
        },
        context,
      );
      if (apiKey.project_uuid !== tokenData.project_uuid) {
        throw new Error('Invalid OAuth token project_uuid');
      }
    } catch (error) {
      throw await new AmsCodeException({
        status: 401,
        code: AmsErrorCode.USER_AUTH_TOKEN_IS_INVALID,
        errorMessage: error.message,
      }).writeToMonitor({
        context,
        user_uuid: event?.user_uuid,
        data: event,
      });
    }

    const authUser = await new AuthUser({}, context).populateByEmail(
      tokenData.email,
    );

    // Fetch user from OUR database. Since a verification was
    // performed with KILT, then the only thing that we need to confirm
    // is that email is present in our database to verify
    // and successfully login the user
    if (!authUser.exists()) {
      throw await new AmsCodeException({
        status: 401,
        code: AmsErrorCode.USER_IS_NOT_AUTHENTICATED,
      }).writeToMonitor({
        logType: LogType.WARN,
        context,
        user_uuid: event?.user_uuid,
        data: event,
      });
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
   * Logout function. Used to logout specific user (logout by admin) or to logout user making the request
   * @param event
   * @param context
   * @returns
   */
  static async logout(event: { user_uuid: string }, context: ServiceContext) {
    const authUser = await new AuthUser({}, context).populateByUserUuid(
      event.user_uuid || context.user.user_uuid,
    );

    if (authUser.exists()) {
      await authUser.logoutUser();
    }
    return true;
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

    let tokenData;
    try {
      tokenData = parseJwtToken(JwtTokenType.USER_AUTHENTICATION, event.token);
    } catch (err) {
      if (err.message === 'jwt expired') {
        throw new AmsCodeException({
          status: 401,
          code: AmsErrorCode.AUTH_TOKEN_EXPIRED,
        });
      }
      throw new AmsCodeException({
        status: 400,
        code: AmsErrorCode.USER_AUTH_TOKEN_IS_INVALID,
      });
    }

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
        logType: LogType.WARN,
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
        logType: LogType.WARN,
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
        logType: LogType.WARN,
        context,
        user_uuid: event?.user_uuid,
        data: event,
      });
    }

    authUser.populate(event, PopulateFrom.SERVICE);
    await authUser.validateOrThrow(AmsValidationException);

    try {
      await authUser.update();
    } catch (err) {
      throw await new AmsCodeException({
        status: 500,
        code: AmsErrorCode.ERROR_WRITING_TO_DATABASE,
      }).writeToMonitor({
        context,
        user_uuid: event?.user_uuid,
        data: { event, err, authUser: authUser.serialize() },
      });
    }

    await Promise.all([
      // send log to monitoring service
      new Lmas().writeLog({
        context,
        logType: LogType.INFO,
        message: 'AuthUser updated!',
        location: 'AMS/UserService/updateAuthUser',
        service: ServiceName.AMS,
      }),
      // Invalidate auth user data cache
      await invalidateCacheMatch(
        `${CacheKeyPrefix.AUTH_USER_DATA}:${authUser.user_uuid}`,
      ),
    ]);

    return authUser.serialize(SerializeFor.SERVICE);
  }
  /**
   * Resets a user's password using their email and new password.
   * @param event An object containing the user's email and new password.
   * @param context The ServiceContext instance for the current request.
   * @returns A boolean value indicating whether the password reset was successful.
   */
  static async resetPassword(event, context: ServiceContext) {
    if (!event?.token || !event.password) {
      throw await new AmsBadRequestException(context, event).writeToMonitor();
    }

    //Decode JWT token to get email
    const decodedToken = decodeJwtToken(event.token);

    if (!decodedToken.email) {
      throw new AmsCodeException({
        status: 400,
        code: AmsErrorCode.INVALID_TOKEN,
      });
    }

    const authUser = await new AuthUser({}, context).populateByEmail(
      decodedToken.email,
    );

    if (!authUser.exists()) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.INVALID_TOKEN,
      }).writeToMonitor({
        logType: LogType.WARN,
        context,
        user_uuid: event?.user_uuid,
        data: event,
      });
    }

    //Use authUser password to parse and verify token
    try {
      parseJwtToken(
        JwtTokenType.USER_RESET_PASSWORD,
        event.token,
        authUser.password,
      );
    } catch (error) {
      throw new AmsCodeException({
        status: 400,
        code: AmsErrorCode.INVALID_TOKEN,
      });
    }

    authUser.setPassword(event.password);
    await authUser.validateOrThrow(AmsValidationException);

    try {
      await authUser.update();
      await authUser.logoutUser();
    } catch (err) {
      throw await new AmsCodeException({
        status: 500,
        code: AmsErrorCode.ERROR_WRITING_TO_DATABASE,
      }).writeToMonitor({
        context,
        user_uuid: event?.user_uuid,
        data: { event, err, authUser: authUser.serialize() },
      });
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
      throw await new AmsBadRequestException(context, event).writeToMonitor();
    }

    const authUser = await new AuthUser({}, context).populateByEmail(
      event.email,
    );

    return { result: authUser.exists(), authUser: authUser.serialize() };
  }
  /**
   * Retrieves an authenticated user's data using their email.
   * @param event An object containing the user's email.
   * @param context The ServiceContext instance for the current request.
   * @returns The authenticated user's data.
   */
  static async getAuthUserByEmail(event, context: ServiceContext) {
    if (!event?.email) {
      throw await new AmsBadRequestException(context, event).writeToMonitor();
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
  static async loginWithWalletAddress(
    event: { authData: UserWalletAuthDto },
    context: ServiceContext,
  ) {
    const authData = new UserWalletAuthDto(event.authData);

    await authData.validateOrThrow(AmsValidationException);

    const { wallet, timestamp } = authData;

    const authUser = await new AuthUser({}, context).populateByWalletAddress(
      wallet,
    );

    if (!authUser.exists()) {
      throw await new AmsCodeException({
        status: 401,
        code: AmsErrorCode.USER_IS_NOT_AUTHENTICATED,
      }).writeToMonitor({
        logType: LogType.WARN,
        context,
        user_uuid: context?.user?.user_uuid,
        data: event,
      });
    }

    // If login token with greater timestamp exists, throw error - signature was already used for login
    const authToken = await new AuthToken({}, context).populateByUserAndType(
      authUser.user_uuid,
      JwtTokenType.USER_AUTHENTICATION,
    );

    if (authToken.exists() && authToken?.updateTime?.getTime() > timestamp) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.WALLET_SIGNATURE_ALREADY_USED,
      }).writeToMonitor({
        context,
        user_uuid: context?.user?.user_uuid,
        data: event,
      });
    }

    //Login user

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

  /**
   * Gets all logins for a user
   * @param event An object containing the user's uuid and query parameters.
   * @param context The ServiceContext instance for the current request.
   * @returns An array of the user's logins
   */
  static async getUserLogins(
    event: { user_uuid: string; query: BaseQueryFilter },
    context: ServiceContext,
  ) {
    if (!event?.user_uuid) {
      throw new AmsCodeException({
        status: 500,
        code: AmsErrorCode.INVALID_EVENT_DATA,
      });
    }

    return await new AuthUser({}, context).listLogins(event);
  }

  /**
   * Gets all roles for a user
   * @param event An object containing the user's uuid and query parameters.
   * @param context The ServiceContext instance for the current request.
   * @returns An array of the user's roles
   */
  static async getUserRoles(
    event: { user_uuid: string; query: BaseQueryFilter },
    context: ServiceContext,
  ) {
    if (!event?.user_uuid) {
      throw new AmsCodeException({
        status: 500,
        code: AmsErrorCode.INVALID_EVENT_DATA,
      });
    }

    return await new AuthUser({}, context).listRoles(event);
  }

  /**
   * Function for setting authUser status (blocking, ...)
   * @param event user uuid & status to be set
   * @param context
   * @returns user
   */
  static async updateAuthUserStatus(
    event: { user_uuid: string; status: SqlModelStatus },
    context: ServiceContext,
  ) {
    const authUser = await new AuthUser({}, context).populateByUserUuid(
      event.user_uuid,
      undefined,
      null,
    );

    if (!authUser.exists()) {
      throw new AmsCodeException({
        status: 400,
        code: AmsErrorCode.USER_DOES_NOT_EXISTS,
      });
    }

    authUser.status = event.status;
    await authUser.validateOrThrow(AmsValidationException);

    try {
      await authUser.update();
    } catch (err) {
      throw await new AmsCodeException({
        status: 500,
        code: AmsErrorCode.ERROR_WRITING_TO_DATABASE,
      }).writeToMonitor({
        context,
        user_uuid: event?.user_uuid,
        data: { event, authUser: authUser.serialize(), err },
      });
    }

    // send log to monitoring service
    await new Lmas().writeLog({
      context,
      logType: LogType.INFO,
      message: 'AuthUser status updated!',
      location: 'AMS/UserService/updateAuthUserStatus',
      service: ServiceName.AMS,
      data: event,
    });

    return authUser.serialize(SerializeFor.SERVICE);
  }
}
