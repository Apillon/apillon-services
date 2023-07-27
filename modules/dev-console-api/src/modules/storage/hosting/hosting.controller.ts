import {
  CreateWebsiteDto,
  DefaultPermission,
  DefaultUserRole,
  DeploymentQueryFilter,
  DeployWebsiteDto,
  ValidateFor,
  WebsiteQueryFilter,
  WebsitesQuotaReachedQueryFilter,
} from '@apillon/lib';
import {
  Ctx,
  Permissions,
  ProjectPermissions,
  Validation,
} from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
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
  @ProjectPermissions()
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

  @Get('websites/:id')
  @ProjectPermissions()
  @UseGuards(AuthGuard)
  async getWebsite(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.hostingService.getWebsite(context, id);
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

  @Patch('websites/:id')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async updateWebsite(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return await this.hostingService.updateWebsite(context, id, body);
  }

  @Post('websites/:id/deploy')
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
    @Param('id', ParseIntPipe) id: number,
    @Body() body: DeployWebsiteDto,
  ) {
    return await this.hostingService.deployWebsite(context, id, body);
  }

  @Get('websites/:website_id/deployments')
  @ProjectPermissions()
  @Validation({
    dto: DeploymentQueryFilter,
    validateFor: ValidateFor.QUERY,
    skipValidation: true,
  })
  @UseGuards(ValidationGuard, AuthGuard)
  async listDeployments(
    @Ctx() context: DevConsoleApiContext,
    @Param('website_id', ParseIntPipe) website_id: number,
    @Query() query: DeploymentQueryFilter,
  ) {
    return await this.hostingService.listDeployments(
      context,
      website_id,
      query,
    );
  }

  @Get('websites/:website_id/deployments/:id')
  @ProjectPermissions()
  @UseGuards(AuthGuard)
  async getDeployment(
    @Ctx() context: DevConsoleApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.hostingService.getDeployment(context, id);
  }
}
