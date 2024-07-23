import {
  AttachedServiceType,
  CreateOasisSignatureDto,
  DefaultApiKeyRole,
  GenerateOtpDto,
  JwtTokenType,
  ValidateOtpDto,
} from '@apillon/lib';
import { ApiKeyPermissions, Ctx, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApillonApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { EmbeddedWalletService } from './embedded-wallet.service';
import { ValidationGuard } from '../../guards/validation.guard';
import { JwtGuard } from '../../guards/jwt.guard';

@Controller('embedded-wallet')
export class EmbeddedWalletController {
  constructor(private ewalletService: EmbeddedWalletService) {}

  @Get('session-token')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.WALLET,
  })
  @UseGuards(AuthGuard)
  async generateSessionToken(@Ctx() context: ApillonApiContext) {
    return await this.ewalletService.generateSessionToken(context);
  }

  @Post('signature')
  @Validation({ dto: CreateOasisSignatureDto })
  @UseGuards(JwtGuard(JwtTokenType.EMBEDDED_WALLET_SDK_TOKEN), ValidationGuard)
  @HttpCode(200)
  async createOasisSignature(
    @Ctx() context: ApillonApiContext,
    @Body() body: CreateOasisSignatureDto,
  ) {
    return await this.ewalletService.createOasisSignature(context, body);
  }

  @Post('otp/generate')
  @Validation({ dto: GenerateOtpDto })
  @UseGuards(JwtGuard(JwtTokenType.EMBEDDED_WALLET_SDK_TOKEN), ValidationGuard)
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
  @UseGuards(JwtGuard(JwtTokenType.EMBEDDED_WALLET_SDK_TOKEN), ValidationGuard)
  async validateOtp(
    @Ctx() context: ApillonApiContext,
    @Body() body: ValidateOtpDto,
  ) {
    return await this.ewalletService.validateOtp(context, body);
  }
}
