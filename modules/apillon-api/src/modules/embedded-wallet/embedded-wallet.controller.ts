import {
  AttachedServiceType,
  CreateOasisSignatureDto,
  DefaultApiKeyRole,
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

@Controller('embedded-wallet')
export class EmbeddedWalletController {
  constructor(private service: EmbeddedWalletService) {}

  @Get('session-token')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.WALLET,
  })
  @UseGuards(AuthGuard)
  async generateSessionToken(@Ctx() context: ApillonApiContext) {
    return await this.service.generateSessionToken(context);
  }

  @Post('signature')
  @Validation({ dto: CreateOasisSignatureDto })
  @UseGuards(ValidationGuard)
  @HttpCode(200)
  async createOasisSignature(
    @Ctx() context: ApillonApiContext,
    @Body() body: CreateOasisSignatureDto,
  ) {
    return await this.service.createOasisSignature(context, body);
  }
}
