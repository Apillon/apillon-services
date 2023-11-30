import {
  CreateWebsiteDto,
  DefaultPermission,
  DefaultUserRole,
  DeploymentQueryFilter,
  DeployWebsiteDto,
  RoleGroup,
  ValidateFor,
  WebsiteQueryFilter,
  WebsitesQuotaReachedQueryFilter,
} from '@apillon/lib';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DevConsoleApiContext } from '../../../context';
import { AuthGuard } from '../../../guards/auth.guard';
import { ValidationGuard } from '../../../guards/validation.guard';
import { HostingService } from './hosting.service';

@Controller('storage/hosting')
@Permissions({ permission: DefaultPermission.HOSTING })
export class HostingController {
  constructor(private hostingService: HostingService) {}

  @Get('websites')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({ dto: WebsiteQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async listWebsites(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: WebsiteQueryFilter,
  ) {
    return await this.hostingService.listWebsites(context, query);
  }

  @Get('websites/quota-reached')
  @Permissions({ role: DefaultUserRole.USER })
  @Validation({
    dto: WebsitesQuotaReachedQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(ValidationGuard, AuthGuard)
  async isWebsitesQuotaReached(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: WebsitesQuotaReachedQueryFilter,
  ) {
    return await this.hostingService.isWebsitesQuotaReached(context, query);
  }

  @Get('websites/:website_uuid')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getWebsite(
    @Ctx() context: DevConsoleApiContext,
    @Param('website_uuid') website_uuid: string,
  ) {
    return await this.hostingService.getWebsite(context, website_uuid);
  }

  @Post('website')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  @Validation({ dto: CreateWebsiteDto })
  @UseGuards(ValidationGuard)
  async createWebsite(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateWebsiteDto,
  ) {
    return await this.hostingService.createWebsite(context, body);
  }

  @Patch('websites/:website_uuid')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async updateWebsite(
    @Ctx() context: DevConsoleApiContext,
    @Param('website_uuid') website_uuid: string,
    @Body() body: any,
  ) {
    return await this.hostingService.updateWebsite(context, website_uuid, body);
  }

  @Post('websites/:website_uuid/deploy')
  @HttpCode(200)
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
  @Validation({ dto: DeployWebsiteDto, skipValidation: true })
  @UseGuards(ValidationGuard)
  async deployWebsite(
    @Ctx() context: DevConsoleApiContext,
    @Param('website_uuid') website_uuid: string,
    @Body() body: DeployWebsiteDto,
  ) {
    return await this.hostingService.deployWebsite(context, website_uuid, body);
  }

  @Get('websites/:website_uuid/deployments')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @Validation({
    dto: DeploymentQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(ValidationGuard, AuthGuard)
  async listDeployments(
    @Ctx() context: DevConsoleApiContext,
    @Param('website_uuid') website_uuid: string,
    @Query() query: DeploymentQueryFilter,
  ) {
    return await this.hostingService.listDeployments(
      context,
      website_uuid,
      query,
    );
  }

  @Get('websites/:website_uuid/deployments/:deployment_uuid')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getDeployment(
    @Ctx() context: DevConsoleApiContext,
    @Param('deployment_uuid') deployment_uuid: string,
  ) {
    return await this.hostingService.getDeployment(context, deployment_uuid);
  }

  @Get('websites/:website_uuid/deployments/:deployment_uuid/approve')
  async approveDeployment(
    @Ctx() context: DevConsoleApiContext,
    @Param('deployment_uuid') deployment_uuid: string,
    @Query('token') token: string,
  ) {
    return await this.hostingService.approveWebsiteDeployment(
      context,
      deployment_uuid,
      token,
    );
  }

  @Get('websites/:website_uuid/deployments/:deployment_uuid/reject')
  async rejectDeployment(
    @Ctx() context: DevConsoleApiContext,
    @Param('deployment_uuid') deployment_uuid: string,
    @Query('token') token: string,
  ) {
    return await this.hostingService.rejectWebsiteDeployment(
      context,
      deployment_uuid,
      token,
    );
  }
}
