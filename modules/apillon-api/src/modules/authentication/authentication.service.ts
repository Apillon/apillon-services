import { generateJwtToken, parseJwtToken } from '@apillon/lib';
import { JwtTokenType } from '../../config/types';
import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';
import { VerifyLoginDto } from '@apillon/lib';

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

  async verifyLogin(_context: ApillonApiContext, query: VerifyLoginDto) {
    try {
      parseJwtToken(JwtTokenType.USER_AUTHENTICATION, query.token);
    } catch (error) {
      return { verified: false };
    }
    return { verified: true };
  }
}
