import {
  CreateOasisSignatureDto,
  GenerateOtpDto,
  ValidateOtpDto,
  CacheKeyPrefix,
  CacheKeyTTL,
  CodeException,
  UnauthorizedErrorCodes,
  ForbiddenErrorCodes,
} from '@apillon/lib';
import { Ctx, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApillonApiContext } from '../../context';
import { EmbeddedWalletService } from './embedded-wallet.service';
import { ValidationGuard } from '../../guards/validation.guard';

@Controller('embedded-wallet')
export class EmbeddedWalletController {
  constructor(private ewalletService: EmbeddedWalletService) {}

  // Note: Session tokens are getting replaced by only using whitelisted domains
  // @Get('session-token')
  // @ApiKeyPermissions({
  //   role: DefaultApiKeyRole.KEY_EXECUTE,
  //   serviceType: AttachedServiceType.WALLET,
  // })
  // @UseGuards(AuthGuard)
  // async generateSessionToken(@Ctx() context: ApillonApiContext) {
  //   return await this.ewalletService.generateSessionToken(context);
  // }

  @Post('signature')
  @Validation({ dto: CreateOasisSignatureDto })
  // @UseGuards(JwtGuard(JwtTokenType.EMBEDDED_WALLET_SDK_TOKEN), ValidationGuard)
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

    if (body.referrerDomain) {
      if (!body.origin?.endsWith('passkey.apillon.io')) {
        throw new CodeException({
          status: HttpStatus.FORBIDDEN,
          code: ForbiddenErrorCodes.INVALID_ORIGIN,
          errorCodes: ForbiddenErrorCodes,
        });
      }
      body.origin = body.referrerDomain;
    }

    return await this.ewalletService.createOasisSignature(context, body);
  }

  // TODO: Need to add some kind of auth/validation, for example captcha
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
}
