import { Lmas, LogType, PopulateFrom, SerializeFor } from 'at-lib';
import { AmsErrorCode } from '../../config/types';
import { ServiceContext } from '../../context';
import { AmsCodeException, AmsValidationException } from '../../lib/exceptions';
import { AuthToken } from './auth-token.model';

export class AuthTokenService {
  static async createUpdateAuthToken(event, context: ServiceContext) {
    if (!event?.auth_token || !event?.user_uuid) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.USER_AUTH_TOKEN_NOT_EXISTS,
      }).writeToMonitor({
        userId: event?.auth_token,
      });
    }

    // 1. getAuthUser - Check if token is valid (signed), find hash(token) and see if it's the correct
    // user, then return the token
    // 2. Login - genereate new token (if login ok), find active token (by subject),
    //    set status to inactive (9), generate new token, return active token.
    // 3. - is token is expired, log user out.
    //    - In DB set to 1D string, which
    //    is for us mostly
    const authToken = await new AuthToken({}, context).populateByUserUuid(
      event.user_uuid,
    );

    if (!authToken.exists()) {
      const authToken = new AuthToken({}, context);
      authToken.populate(event, PopulateFrom.SERVICE);

      try {
        await authToken.validate();
      } catch (err) {
        throw new AmsValidationException(authToken);
      }

      const conn = await context.mysql.start();

      try {
        await authToken.insert(SerializeFor.INSERT_DB, conn);
        await context.mysql.commit(conn);
      } catch (err) {
        await context.mysql.rollback(conn);
        throw await new AmsCodeException({
          status: 500,
          code: AmsErrorCode.ERROR_WRITING_TO_DATABASE,
        }).writeToMonitor({ userId: event?.user_uuid });
      }
    }

    await new Lmas().writeLog(
      {
        logType: LogType.INFO,
        message: 'Updating AuthToken!',
        userId: authToken.user_uuid,
        location: 'AMS/AuthTokenService/createUpdateAuthToken',
      },
      'secToken1', // TODO: Replace
    );
  }
}
