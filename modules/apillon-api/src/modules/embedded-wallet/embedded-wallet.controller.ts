import {
  CreateOasisSignatureDto,
  GenerateOtpDto,
  ValidateOtpDto,
  CacheKeyPrefix,
  CacheKeyTTL,
  CodeException,
  ForbiddenErrorCodes,
  env,
  AppEnvironment,
} from '@apillon/lib';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Cache, CacheInterceptor, Ctx, Validation } from '@apillon/modules-lib';
import { ApillonApiContext } from '../../context';
import { EmbeddedWalletService } from './embedded-wallet.service';
import { ValidationGuard } from '../../guards/validation.guard';

@Controller('embedded-wallet')
@UseInterceptors(CacheInterceptor)
export class EmbeddedWalletController {
  constructor(private ewalletService: EmbeddedWalletService) {}

  @Post('signature')
  @Validation({ dto: CreateOasisSignatureDto })
  @UseGuards(ValidationGuard)
  @HttpCode(200)
  async createOasisSignature(
    @Ctx() context: ApillonApiContext,
    @Body() body: CreateOasisSignatureDto,
    @Req() request: Request,
  ) {
    body.origin =
      request.headers[
        ['origin', 'referer', 'host'].find((h) => !!request.headers[h])
      ];

    // If body referrer domain is present, check that domain for embedded wallet whitelist
    if (body.referrerDomain) {
      // Request origin must match with the passkey gateway URL
      if (
        !body.origin?.endsWith(env.PASSKEY_GATEWAY_URL) &&
        [AppEnvironment.STG, AppEnvironment.PROD].includes(
          env.APP_ENV as AppEnvironment,
        )
      ) {
        throw new CodeException({
          status: HttpStatus.FORBIDDEN,
          code: ForbiddenErrorCodes.INVALID_ORIGIN,
          errorCodes: ForbiddenErrorCodes,
        });
      }
      const url = new URL(body.referrerDomain);
      body.origin = url.port ? `${url.hostname}:${url.port}` : url.hostname;
    }

    return await this.ewalletService.createOasisSignature(context, body);
  }

  @Post('otp/generate')
  @Validation({ dto: GenerateOtpDto })
  @UseGuards(ValidationGuard)
  @HttpCode(200)
  async generateOtp(
    @Ctx() context: ApillonApiContext,
    @Body() body: GenerateOtpDto,
  ) {
    return await this.ewalletService.generateOtp(context, body);
  }

  @Post('otp/validate')
  @Validation({ dto: ValidateOtpDto })
  @HttpCode(200)
  @UseGuards(ValidationGuard)
  async validateOtp(
    @Ctx() context: ApillonApiContext,
    @Body() body: ValidateOtpDto,
  ) {
    return await this.ewalletService.validateOtp(context, body);
  }

  @Get('evm-token-prices')
  @Cache({
    keyPrefix: CacheKeyPrefix.EVM_TOKEN_PRICES,
    ttl: CacheKeyTTL.EXTENDED,
  })
  async getTopEvmTokenPrices() {
    return await this.ewalletService.getEvmTokenPrices();
  }
}
