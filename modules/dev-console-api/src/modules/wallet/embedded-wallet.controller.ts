import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  CacheByProject,
  Ctx,
  Permissions,
  Validation,
} from '@apillon/modules-lib';
import {
  BaseProjectQueryFilter,
  CacheKeyPrefix,
  CacheKeyTTL,
  DefaultPermission,
  OasisSignaturesQueryFilter,
  RoleGroup,
  ValidateFor,
} from '@apillon/lib';
import { ValidationGuard } from '../../guards/validation.guard';
import { AuthGuard } from '../../guards/auth.guard';
import { DevConsoleApiContext } from '../../context';
import { EmbeddedWalletService } from './embedded-wallet.service';
import { ProjectsQueryFilter } from '../admin-panel/project/dtos/projects-query-filter.dto';

@Controller('embedded-wallet')
@Permissions({ permission: DefaultPermission.WALLET })
export class EmbeddedWalletController {
  constructor(private readonly service: EmbeddedWalletService) {}

  @Get('integrations')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: BaseProjectQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async getIntegrationsList(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: BaseProjectQueryFilter,
  ) {
    return await this.service.getIntegrationsList(context, query);
  }

  @Get('integrations/:integration_uuid')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getIpns(
    @Ctx() context: DevConsoleApiContext,
    @Param('ipns_uuid') ipns_uuid: string,
  ) {
    return await this.ipnsService.getIpns(context, ipns_uuid);
  }

  @Post('integration')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  @Validation({ dto: CreateIpnsDto })
  @UseGuards(ValidationGuard)
  async createIpnsRecord(
    @Ctx() context: DevConsoleApiContext,
    @Param('bucket_uuid') bucket_uuid: string,
    @Body() body: CreateIpnsDto,
  ) {
    return await this.ipnsService.createIpns(context, bucket_uuid, body);
  }

  @Patch('integrations/:integration_uuid')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async updateIpns(
    @Ctx() context: DevConsoleApiContext,
    @Param('ipns_uuid') ipns_uuid: string,
    @Body() body: any,
  ) {
    return await this.ipnsService.updateIpns(context, ipns_uuid, body);
  }

  @Get('oasis-signatures-count-by-api-key')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async oasisSignatureStatistic(
    @Ctx() context: DevConsoleApiContext,
    @Query('project_uuid') project_uuid: string,
  ) {
    return await this.walletService.getOasisSignaturesCountByApiKey(
      context,
      project_uuid,
    );
  }

  @Get('oasis-signatures')
  @Validation({
    dto: OasisSignaturesQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(ValidationGuard, AuthGuard)
  async listOasisSignatures(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: OasisSignaturesQueryFilter,
  ) {
    return await this.walletService.listOasisSignatures(context, query);
  }
}
