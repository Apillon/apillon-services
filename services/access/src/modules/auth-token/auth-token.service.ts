import { AmsErrorCode } from '../../config/types';
import { ServiceContext } from '../../context';
import { AmsCodeException } from '../../lib/exceptions';
import { AuthToken } from './auth-token.model';

export class AuthTokenService {
  static async getAuthToken(event, context: ServiceContext) {
    if (!event?.user_uuid) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.BAD_REQUEST,
      }).writeToMonitor({
        userId: event?.user_uuid,
      });
    }

    const authToken = await new AuthToken({}, context).populateByUserUuid(
      event.user_uuid,
    );

    if (!authToken.exists()) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.USER_AUTH_TOKEN_NOT_EXISTS,
      }).writeToMonitor({
        userId: event?.user_uuid,
      });
    }
  }
}
