import {
  AuthenticationMicroservice,
  BadRequestErrorCode,
  CodeException,
  CreateOasisSignatureDto,
  JwtExpireTime,
  JwtTokenType,
  generateJwtToken,
  parseJwtToken,
} from '@apillon/lib';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';

@Injectable()
export class OasisService {
  async generateSessionToken(context: ApillonApiContext) {
    const token = generateJwtToken(
      JwtTokenType.OASIS_SDK_TOKEN,
      {
        project_uuid: context.apiKey.project_uuid,
        apiKey: context.apiKey.apiKey,
      },
      JwtExpireTime.FIVE_MINUTES,
    );

    return { token };
  }

  async createOasisSignature(
    context: ApillonApiContext,
    body: CreateOasisSignatureDto,
  ) {
    //Validate and parse token
    try {
      const tokenData = parseJwtToken(JwtTokenType.OASIS_SDK_TOKEN, body.token);
      body.project_uuid = tokenData.project_uuid;
      body.apiKey = tokenData.apiKey;
    } catch (err) {
      throw new CodeException({
        code: BadRequestErrorCode.INVALID_AUTHORIZATION_HEADER,
        status: HttpStatus.BAD_REQUEST,
        errorMessage: 'Invalid token',
      });
    }

    console.info(context);

    return (
      await new AuthenticationMicroservice(context).createOasisSignature(body)
    ).data;
  }
}
