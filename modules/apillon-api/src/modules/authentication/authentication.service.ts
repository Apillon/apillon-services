import { JwtTokenType, generateJwtToken, parseJwtToken } from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';
import { ApiCodeException } from '../../lib/exceptions';
import { ApiErrorCode } from '../../config/types';

@Injectable()
export class AuthService {
  async generateSessionToken(context: ApillonApiContext) {
    const token = generateJwtToken(
      JwtTokenType.AUTH_SESSION,
      { project_uuid: context.apiKey.project_uuid },
      '10min',
    );

    return { session: token };
  }

  async verifyLogin(_context: ApillonApiContext, token: string) {
    try {
      return parseJwtToken(JwtTokenType.USER_AUTHENTICATION, token);
    } catch (error) {
      throw new ApiCodeException({
        status: 401,
        code: ApiErrorCode.INVALID_AUTH_TOKEN,
      });
    }
  }
}
