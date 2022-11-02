import {
  generateJwtToken,
  JwtTokenType,
  Lmas,
  LogType,
  parseJwtToken,
  PopulateFrom,
  SerializeFor,
} from 'at-lib';
import { AmsErrorCode, SqlModelStatus } from '../../config/types';
import { ServiceContext } from '../../context';
import { AmsCodeException, AmsValidationException } from '../../lib/exceptions';
import { AuthUser } from './auth-user.model';
import { AuthToken } from '../auth-token/auth-token.model';

import { TokenExpiresInStr } from '../../config/types';
import * as bcrypt from 'bcryptjs';

export class AuthUserService {
  static async register(event, context: ServiceContext) {
    if (!event?.user_uuid || !event.password || !event.email) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.BAD_REQUEST,
      }).writeToMonitor({
        userId: event?.user_uuid,
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

      // Generate a new token with type USER_AUTH
      authUser.token = generateJwtToken(JwtTokenType.USER_AUTHENTICATION, {
        user_uuid: authUser.user_uuid,
      });

      // Create new token in the database
      const authToken = new AuthToken({}, context);
      const tokenData = {
        tokenHash: bcrypt.hashSync(authUser.token, 10),
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
      }).writeToMonitor({ userId: authUser?.user_uuid });
    }

    await new Lmas().writeLog(
      {
        logType: LogType.INFO,
        message: 'New User Registration!',
        userId: authUser.user_uuid,
        location: 'AMS/UserService/register',
      },
      'secToken1',
    );

    const res = authUser.serialize(SerializeFor.SERVICE);
    console.log(res);
    return res;
  }

  static async login(event, context: ServiceContext) {
    // Start connection to database at the beginning of the function
    const conn = await context.mysql.start();

    const authUser = await new AuthUser({}, context).populateByEmail(
      event.email,
    );
    if (!authUser.exists() || !authUser.verifyPassword(event.password)) {
      throw await new AmsCodeException({
        status: 401,
        code: AmsErrorCode.USER_IS_NOT_AUTHENTICATED,
      }).writeToMonitor({ userId: authUser?.user_uuid });
    }

    // Generate a new token with type USER_AUTH
    authUser.token = generateJwtToken(JwtTokenType.USER_AUTHENTICATION, {
      user_uuid: authUser.user_uuid,
    });

    // Create new token in the database
    const authToken = new AuthToken({}, context);
    const tokenData = {
      tokenHash: bcrypt.hashSync(authUser.token, 10),
      user_uuid: authUser.user_uuid,
      tokenType: JwtTokenType.USER_AUTHENTICATION,
      expiresIn: TokenExpiresInStr.EXPIRES_IN_1_DAY,
    };

    authToken.populate({ ...tokenData }, PopulateFrom.SERVICE);

    try {
      await authToken.validate();
    } catch (err) {
      throw new AmsValidationException(authToken);
    }

    try {
      // Find old token
      const oldToken = await new AuthToken({}, context).populateByUserAndType(
        authUser.user_uuid,
        JwtTokenType.USER_AUTHENTICATION,
        conn,
      );

      if (oldToken.exists()) {
        oldToken.status = SqlModelStatus.DELETED;
        await oldToken.update(SerializeFor.UPDATE_DB, conn);
      }

      await authToken.insert(SerializeFor.INSERT_DB, conn);

      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);
      throw await new AmsCodeException({
        status: 500,
        code: AmsErrorCode.ERROR_WRITING_TO_DATABASE,
      }).writeToMonitor({ userId: authUser?.user_uuid });
    }

    await new Lmas().writeLog(
      {
        logType: LogType.INFO,
        message: 'User login',
        location: 'AMS/UserService/login',
        userId: authUser.user_uuid,
      },
      'secToken1',
    );

    return authUser.serialize(SerializeFor.SERVICE);
  }

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
        userId: event?.user_uuid,
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
        userId: event?.user_uuid,
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
        userId: event?.user_uuid,
      });
    }

    // Find old token
    const authToken = await new AuthToken({}, context).populateByUserAndType(
      tokenData.user_uuid,
      JwtTokenType.USER_AUTHENTICATION,
    );

    if (
      !authToken.exists() ||
      !bcrypt.compareSync(event.token, authToken.tokenHash)
    ) {
      throw await new AmsCodeException({
        status: 401,
        code: AmsErrorCode.USER_IS_NOT_AUTHENTICATED,
      }).writeToMonitor({
        userId: event?.user_uuid,
      });
    }

    authUser.token = event.token;

    return authUser.serialize(SerializeFor.SERVICE);
  }

  static async updateAuthUser(event, context: ServiceContext) {
    // send log to monitoring service
    await new Lmas().writeLog(
      {
        logType: LogType.INFO,
        message: 'AuthUser update!',
        location: 'AMS/UserService/updateAuthUser',
      },
      'secToken1',
    );

    const authUser = await new AuthUser({}, context).populateByUserUuid(
      event.user_uuid,
    );

    if (!authUser.exists()) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.USER_DOES_NOT_EXISTS,
      }).writeToMonitor({
        userId: event?.user_uuid,
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
        userId: event?.user_uuid,
      });
    }

    return authUser.serialize(SerializeFor.SERVICE);
  }

  static async resetPassword(event, context: ServiceContext) {
    if (!event?.user_uuid || !event.password) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.BAD_REQUEST,
      }).writeToMonitor({
        userId: event?.user_uuid,
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
      });
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
      }).writeToMonitor({
        userId: event?.user_uuid,
      });
    }
  }

  static async emailExists(event, context: ServiceContext) {
    if (!event?.email) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.BAD_REQUEST,
      }).writeToMonitor({
        userId: event?.user_uuid,
      });
    }

    const authUser = await new AuthUser({}, context).populateByEmail(
      event.email,
    );

    return { result: authUser.exists() };
  }

  static async getAuthUserByEmail(event, context: ServiceContext) {
    if (!event?.email) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.BAD_REQUEST,
      }).writeToMonitor({
        userId: event?.user_uuid,
      });
    }

    const authUser = await new AuthUser({}, context).populateByEmail(
      event.email,
    );

    if (!authUser.exists()) return undefined;

    return authUser.serialize(SerializeFor.SERVICE);
  }
}
