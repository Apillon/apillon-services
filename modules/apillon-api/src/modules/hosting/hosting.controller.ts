import {
  ApillonHostingApiCreateS3UrlsForUploadDto,
  AttachedServiceType,
  DefaultApiKeyRole,
  DeployWebsiteDto,
  DeploymentQueryFilter,
  DomainQueryFilter,
  EndFileUploadSessionDto,
  ShortUrlDto,
  ValidateFor,
  WebsiteQueryFilter,
} from '@apillon/lib';
import { ApiKeyPermissions, Ctx, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApillonApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { HostingService } from './hosting.service';

@Controller('hosting')
export class HostingController {
  constructor(private hostingService: HostingService) {}

  @Get('domains')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.SYSTEM,
  })
  @Validation({ dto: DomainQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async listDomains(
    @Ctx() context: ApillonApiContext,
    @Query() query: DomainQueryFilter,
  ) {
    return await this.hostingService.listDomains(context, query);
  }

  @Get('websites')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.HOSTING,
  })
  @Validation({ dto: WebsiteQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async listWebsites(
    @Ctx() context: ApillonApiContext,
    @Query() query: WebsiteQueryFilter,
  ) {
    return await this.hostingService.listWebsites(context, query);
  }

  /*
  @Post('websites')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_WRITE,
    serviceType: AttachedServiceType.HOSTING,
  })
  @UseGuards(AuthGuard)
  @Validation({ dto: CreateWebsiteDto })
  @UseGuards(ValidationGuard)
  async createWebsite(
    @Ctx() context: ApillonApiContext,
    @Body() body: CreateWebsiteDto,
  ) {
    return await this.hostingService.createWebsite(context, body);
  }*/

  @Get('websites/:website_uuid')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.HOSTING,
  })
  @UseGuards(AuthGuard)
  async getWebsite(
    @Ctx() context: ApillonApiContext,
    @Param('website_uuid') website_uuid: string,
  ) {
    return await this.hostingService.getWebsite(context, website_uuid);
  }

  @Post('websites/:website_uuid/upload')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.HOSTING,
  })
  @UseGuards(AuthGuard)
  @Validation({
    dto: ApillonHostingApiCreateS3UrlsForUploadDto,
  })
  @UseGuards(ValidationGuard)
  async createS3SignedUrlsForWebsiteUpload(
    @Ctx() context: ApillonApiContext,
    @Param('website_uuid') website_uuid: string,
    @Body() body: ApillonHostingApiCreateS3UrlsForUploadDto,
  ) {
    return await this.hostingService.createS3SignedUrlsForWebsiteUpload(
      context,
      website_uuid,
      body,
    );
  }

  @Post('websites/:website_uuid/upload/:sessionUuid/end')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.HOSTING,
  })
  @UseGuards(AuthGuard)
  @Validation({ dto: EndFileUploadSessionDto })
  @UseGuards(ValidationGuard)
  @HttpCode(200)
  async endFileUploadSession(
    @Ctx() context: ApillonApiContext,
    @Param('website_uuid') website_uuid: string,
    @Param('sessionUuid') session_uuid: string,
    @Body() body: EndFileUploadSessionDto,
  ) {
    return await this.hostingService.endFileUploadSession(
      context,
      website_uuid,
      session_uuid,
      body,
    );
  }

  @Post('websites/:website_uuid/deploy')
  @HttpCode(200)
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.HOSTING,
  })
  @UseGuards(AuthGuard)
  @Validation({ dto: DeployWebsiteDto, skipValidation: true })
  @UseGuards(ValidationGuard)
  async deployWebsite(
    @Ctx() context: ApillonApiContext,
    @Param('website_uuid') website_uuid: string,
    @Body() body: DeployWebsiteDto,
  ) {
    return await this.hostingService.deployWebsite(context, website_uuid, body);
  }

  @Get('websites/:website_uuid/deployments')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.HOSTING,
  })
  @Validation({
    dto: DeploymentQueryFilter,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(AuthGuard, ValidationGuard)
  async listDeployments(
    @Ctx() context: ApillonApiContext,
    @Param('website_uuid') website_uuid: string,
    @Query() query: DeploymentQueryFilter,
  ) {
    return await this.hostingService.listDeployments(
      context,
      website_uuid,
      query,
    );
  }

  @Get('websites/:website_id/deployments/:deployment_uuid')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.HOSTING,
  })
  @UseGuards(AuthGuard)
  async getDeployment(
    @Ctx() context: ApillonApiContext,
    @Param('deployment_uuid') deployment_uuid: string,
  ) {
    return await this.hostingService.getDeployment(context, deployment_uuid);
  }

  @Post('short-url')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_WRITE,
    serviceType: AttachedServiceType.HOSTING,
  })
  @Validation({ dto: ShortUrlDto })
  @UseGuards(AuthGuard, ValidationGuard)
  async generateShortUrl(
    @Ctx() context: ApillonApiContext,
    @Body() body: ShortUrlDto,
  ) {
    return await this.hostingService.generateShortUrl(body, context);
  }
}
