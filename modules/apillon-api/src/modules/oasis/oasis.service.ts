import { JwtExpireTime, JwtTokenType, generateJwtToken } from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';

@Injectable()
export class OasisService {
  async generateSessionToken(context: ApillonApiContext) {
    const sessionToken = generateJwtToken(
      JwtTokenType.OASIS_SDK_TOKEN,
      { project_uuid: context.apiKey.project_uuid },
      JwtExpireTime.TWENTY_MINUTES,
    );

    return { sessionToken };
  }
}
