import { AttachedServiceType, DefaultApiKeyRole } from '@apillon/lib';
import { ApiKeyPermissions, Ctx } from '@apillon/modules-lib';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApillonApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { OasisService } from './oasis.service';

@Controller('oasis')
export class OasisController {
  constructor(private oasisService: OasisService) {}

  @Get('session-token')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.AUTHENTICATION,
  })
  @UseGuards(AuthGuard)
  async generateSessionToken(@Ctx() context: ApillonApiContext) {
    return await this.oasisService.generateSessionToken(context);
  }
}
