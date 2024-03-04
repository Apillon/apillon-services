import {
  ApillonHostingApiCreateS3UrlsForUploadDto,
  AttachedServiceType,
  BaseProjectQueryFilter,
  CreateSpaceDto,
  DefaultApiKeyRole,
  DeployWebsiteDto,
  DeploymentQueryFilter,
  DomainQueryFilter,
  EndFileUploadSessionDto,
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
import { SocialService } from './social.service';

@Controller('social')
export class SocialController {
  constructor(private socialService: SocialService) {}

  @Get('hubs')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.SOCIAL,
  })
  @Validation({ dto: BaseProjectQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async listHubs(
    @Ctx() context: ApillonApiContext,
    @Query() query: BaseProjectQueryFilter,
  ) {
    return await this.socialService.listHubs(context, query);
  }

  @Post('hubs')
  @Validation({ dto: CreateSpaceDto })
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_WRITE,
    serviceType: AttachedServiceType.SOCIAL,
  })
  @UseGuards(AuthGuard, ValidationGuard)
  async createHub(
    @Ctx() context: ApillonApiContext,
    @Body() body: CreateSpaceDto,
  ) {
    return await this.socialService.createHub(context, body);
  }
}
