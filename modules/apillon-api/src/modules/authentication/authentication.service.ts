import { generateJwtToken, parseJwtToken } from '@apillon/lib';
import { JwtTokenType } from '../../config/types';
import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';
import { VerifySessionDto } from './dtos/verify-session.dto';

@Injectable()
export class AuthService {
  async generateSession(context: ApillonApiContext) {
    const token = generateJwtToken(JwtTokenType.AUTH_SESSION, '10min');
    return {
      token: token,
    };
  }

  async verifySession(context: ApillonApiContext, query: VerifySessionDto) {
    try {
      parseJwtToken(JwtTokenType.USER_AUTHENTICATION, query.token);
    } catch (error) {
      console.log(error);
      return { verified: false };
    }

    return { verified: true };
  }
}
