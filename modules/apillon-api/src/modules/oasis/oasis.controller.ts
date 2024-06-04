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
import { OasisService } from './oasis.service';
import { ValidationGuard } from '../../guards/validation.guard';

@Controller('oasis')
export class OasisController {
  constructor(private oasisService: OasisService) {}

  @Get('session-token')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.WALLET,
  })
  @UseGuards(AuthGuard)
  async generateSessionToken(@Ctx() context: ApillonApiContext) {
    return await this.oasisService.generateSessionToken(context);
  }

  @Post('signature')
  @Validation({ dto: CreateOasisSignatureDto })
  @UseGuards(ValidationGuard)
  @HttpCode(200)
  async createOasisSignature(
    @Ctx() context: ApillonApiContext,
    @Body() body: CreateOasisSignatureDto,
  ) {
    return await this.oasisService.createOasisSignature(context, body);
  }
}
