import {
  AttachedServiceType,
  DefaultApiKeyRole,
  DomainQueryFilter,
  ValidateFor,
} from '@apillon/lib';
import { ApiKeyPermissions, Ctx, Validation } from '@apillon/modules-lib';
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApillonApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { SystemService } from './system.service';
import { ValidationGuard } from '../../guards/validation.guard';

@Controller('system')
export class SystemController {
  constructor(private systemService: SystemService) {}

  @Get('blocked-on-ipfs')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.SYSTEM,
  })
  @Validation({ dto: DomainQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async getProjectsBlockedOnIpfs(
    @Ctx() context: ApillonApiContext,
    @Query() query: DomainQueryFilter,
  ) {
    return await this.systemService.getProjectsBlockedOnIpfs(context, query);
  }

  @Get('ipns/:ipnsName')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.SYSTEM,
  })
  @UseGuards(AuthGuard)
  async getIpnsByName(
    @Ctx() context: ApillonApiContext,
    @Param('ipnsName') ipnsName: string,
  ) {
    return await this.systemService.getIpnsByName(context, ipnsName);
  }
}
