import {
  AuthenticationMicroservice,
  BadRequestErrorCode,
  CodeException,
  CreateOasisSignatureDto,
  GenerateOtpDto,
  JwtExpireTime,
  JwtTokenType,
  ValidateOtpDto,
  generateJwtToken,
  parseJwtToken,
} from '@apillon/lib';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';

@Injectable()
export class EmbeddedWalletService {
  // async generateSessionToken(context: ApillonApiContext) {
  //   const token = generateJwtToken(
  //     JwtTokenType.EMBEDDED_WALLET_SDK_TOKEN,
  //     {
  //       project_uuid: context.apiKey.project_uuid,
  //       apiKey: context.apiKey.apiKey,
  //     },
  //     JwtExpireTime.TWENTY_MINUTES,
  //   );

  //   return { token };
  // }

  async createOasisSignature(
    context: ApillonApiContext,
    body: CreateOasisSignatureDto,
  ) {
    const tokenData = parseJwtToken(
      JwtTokenType.EMBEDDED_WALLET_SDK_TOKEN,
      body.token,
    );
    body.project_uuid = tokenData.project_uuid;
    body.apiKey = tokenData.apiKey;

    return (
      await new AuthenticationMicroservice(context).createOasisSignature(body)
    ).data;
  }

  async generateOtp(
    context: ApillonApiContext,
    body: GenerateOtpDto,
  ): Promise<void> {
    return (await new AuthenticationMicroservice(context).generateOtp(body))
      .data;
  }

  async validateOtp(context: ApillonApiContext, body: ValidateOtpDto) {
    return (await new AuthenticationMicroservice(context).validateOtp(body))
      .data;
  }
}
