import { Lmas, LogType, PopulateFrom, SerializeFor } from 'at-lib';
import { AmsErrorCode } from '../../config/types';
import { ServiceContext } from '../../context';
import { AmsCodeException, AmsValidationException } from '../../lib/exceptions';
import { AuthUser } from './auth-user.model';

export class AuthUserService {
  static async register(event, context: ServiceContext) {
    //
    const authUser = new AuthUser({}, context);
    authUser.populate(event, PopulateFrom.SERVICE);

    authUser.setPassword(event.password);
    try {
      await authUser.validate();
    } catch (err) {
      throw new AmsValidationException(authUser);
    }
    const conn = await context.mysql.start();
    try {
      await authUser.insert(SerializeFor.INSERT_DB, conn);

      //TODO: assign user roles
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

    return authUser.serialize(SerializeFor.SERVICE);
  }

  static async login(event, context: ServiceContext) {
    const authUser = await new AuthUser({}, context).populateByEmail(
      event.email,
    );
    if (!authUser.exists() || !authUser.verifyPassword(event.password)) {
      throw await new AmsCodeException({
        status: 401,
        code: AmsErrorCode.USER_IS_NOT_AUTHENTICATED,
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

    const authUser = await new AuthUser({}, context).populateByUserUuid(
      event.user_uuid,
    );

    if (authUser.exists()) {
      return authUser.serialize(SerializeFor.SERVICE);
    }
  }
}
