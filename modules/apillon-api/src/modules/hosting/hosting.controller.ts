import {
  ApillonHostingApiCreateS3UrlsForUploadDto,
  EndFileUploadSessionDto,
} from '@apillon/lib';
import {
  AttachedServiceType,
  DefaultApiKeyRole,
  DeployWebsiteDto,
} from '@apillon/lib';
import { ApiKeyPermissions, Ctx, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
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
  async listDomains(@Ctx() context: ApillonApiContext) {
    return await this.hostingService.listDomains(context);
  }

  @Get('websites/:id')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.STORAGE,
  })
  @UseGuards(AuthGuard)
  async getWebsite(@Ctx() context: ApillonApiContext, @Param('id') id: any) {
    return await this.hostingService.getWebsite(context, id);
  }

  @Post('websites/:id/upload')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.STORAGE,
  })
  @UseGuards(AuthGuard)
  @Validation({
    dto: ApillonHostingApiCreateS3UrlsForUploadDto,
    skipValidation: true,
  })
  @UseGuards(ValidationGuard)
  async createS3SignedUrlsForWebsiteUpload(
    @Ctx() context: ApillonApiContext,
    @Param('id') id: any,
    @Body() body: ApillonHostingApiCreateS3UrlsForUploadDto,
  ) {
    return await this.hostingService.createS3SignedUrlsForWebsiteUpload(
      context,
      id,
      body,
    );
  }

  @Post('websites/:id/upload/:sessionUuid/end')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.STORAGE,
  })
  @UseGuards(AuthGuard)
  @Validation({ dto: EndFileUploadSessionDto })
  @UseGuards(ValidationGuard)
  @HttpCode(200)
  async endFileUploadSession(
    @Ctx() context: ApillonApiContext,
    @Param('id') website_uuid: string,
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

  @Post('websites/:id/deploy')
  @HttpCode(200)
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.STORAGE,
  })
  @UseGuards(AuthGuard)
  @Validation({ dto: DeployWebsiteDto, skipValidation: true })
  @UseGuards(ValidationGuard)
  async deployWebsite(
    @Ctx() context: ApillonApiContext,
    @Param('id') id: any,
    @Body() body: DeployWebsiteDto,
  ) {
    return await this.hostingService.deployWebsite(context, id, body);
  }

  @Get('websites/:website_id/deployments/:id')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.STORAGE,
  })
  @UseGuards(AuthGuard)
  async getDeployment(
    @Ctx() context: ApillonApiContext,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.hostingService.getDeployment(context, id);
  }
}
