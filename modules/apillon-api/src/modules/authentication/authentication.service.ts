import {
  JwtExpireTime,
  JwtTokenType,
  generateJwtToken,
  parseJwtToken,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';
import { ApiCodeException } from '../../lib/exceptions';
import { ApiErrorCode } from '../../config/types';

@Injectable()
export class AuthService {
  async generateSessionToken(context: ApillonApiContext) {
    const sessionToken = generateJwtToken(
      JwtTokenType.AUTH_SESSION,
      { project_uuid: context.apiKey.project_uuid },
      JwtExpireTime.TWENTY_MINUTES,
    );

    return { sessionToken };
  }

  async verifyOauthLogin(_context: ApillonApiContext, token: string) {
    try {
      const { email } = parseJwtToken(JwtTokenType.OAUTH_TOKEN, token);
      return { email };
    } catch (error) {
      throw new ApiCodeException({
        status: 401,
        code: ApiErrorCode.INVALID_AUTH_TOKEN,
      });
    }
  }
}
