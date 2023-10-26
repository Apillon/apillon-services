import { AttachedServiceType, DefaultApiKeyRole } from '@apillon/lib';
import { ApiKeyPermissions, Ctx } from '@apillon/modules-lib';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApillonApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { SystemService } from './system.service';

@Controller('system')
export class SystemController {
  constructor(private systemService: SystemService) {}

  @Get('blocked-on-ipfs')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.SYSTEM,
  })
  @UseGuards(AuthGuard)
  async getProjectsBlockedOnIpfs(@Ctx() context: ApillonApiContext) {
    return await this.systemService.getProjectsBlockedOnIpfs(context);
  }
}
