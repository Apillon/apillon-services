import { AmsErrorCode, AuthTokenConfig } from '../../config/types';
import { ServiceContext } from '../../context';
import { AmsCodeException } from '../../lib/exceptions';
import { AuthToken } from './auth-token.model';

export class AuthTokenService {
  static async getAuthToken(event, context: ServiceContext) {
    if (!event?.auth_token) {
      throw await new AmsCodeException({
        status: 400,
        code: AmsErrorCode.USER_AUTH_TOKEN_NOT_EXISTS,
      }).writeToMonitor({
        userId: event?.auth_token,
      });
    }

    const new_token = event.auth_token;
    const existing_token = await new AuthToken({}, context).populateByAuthToken(
      new_token,
    );

    if (existing_token.exists()) {
      existing_token.token = new_token;
      // TODO: Check if this is valid
      // existing_token.expiresAt = new Date();
    } else {
      await new AuthToken({}, context).insert(event);
    }
  }
}
