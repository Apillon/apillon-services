import { generateJwtToken } from '@apillon/lib';
import { JwtTokenType } from '../../config/types';
import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';

@Injectable()
export class AuthService {
  async generateSession(context: ApillonApiContext) {
    const token = generateJwtToken(
      JwtTokenType.AUTH_SESSION,
      {
        apiKey: context.apiKey.apiKey,
        apiKeySecret: context.apiKey.apiKeySecret,
      },
      '10min',
    );
    return {
      token: token,
    };
  }
}
