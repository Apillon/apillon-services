import {
  ApillonApiCreatePostDto,
  AttachedServiceType,
  BaseProjectQueryFilter,
  CreateSpaceDto,
  DefaultApiKeyRole,
  SocialPostQueryFilter,
  ValidateFor,
} from '@apillon/lib';
import { ApiKeyPermissions, Ctx, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Get,
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

  /*
    NOTE: 
    In console and in Apillon api naming of components is different than in social MS. 
    Hub --> space
    Channel --> post
  */

  @Get('hubs')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.SOCIAL,
  })
  @Validation({ dto: BaseProjectQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(AuthGuard, ValidationGuard)
  async listSpaces(
    @Ctx() context: ApillonApiContext,
    @Query() query: BaseProjectQueryFilter,
  ) {
    return await this.socialService.listSpaces(context, query);
  }

  @Get('hubs/:hub_uuid')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.SOCIAL,
  })
  @UseGuards(AuthGuard)
  async getSpace(
    @Ctx() context: ApillonApiContext,
    @Param('hub_uuid') space_uuid: string,
  ) {
    return await this.socialService.getSpace(context, space_uuid);
  }

  @Post('hubs')
  @Validation({ dto: CreateSpaceDto })
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_WRITE,
    serviceType: AttachedServiceType.SOCIAL,
  })
  @UseGuards(AuthGuard, ValidationGuard)
  async createSpace(
    @Ctx() context: ApillonApiContext,
    @Body() body: CreateSpaceDto,
  ) {
    return await this.socialService.createSpace(context, body);
  }

  @Get('channels')
  @Validation({ dto: SocialPostQueryFilter, validateFor: ValidateFor.QUERY })
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.SOCIAL,
  })
  @UseGuards(ValidationGuard, AuthGuard)
  async listChannels(
    @Ctx() context: ApillonApiContext,
    @Query() query: SocialPostQueryFilter,
  ) {
    return await this.socialService.listPosts(context, query.hubUuid, query);
  }

  @Get('channels/:channel_uuid')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_READ,
    serviceType: AttachedServiceType.SOCIAL,
  })
  @UseGuards(AuthGuard)
  async getPost(
    @Ctx() context: ApillonApiContext,
    @Param('channel_uuid') post_uuid: string,
  ) {
    return await this.socialService.getPost(context, post_uuid);
  }

  @Post('channels')
  @Validation({ dto: ApillonApiCreatePostDto })
  @UseGuards(ValidationGuard)
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_WRITE,
    serviceType: AttachedServiceType.SOCIAL,
  })
  @UseGuards(AuthGuard)
  async createPost(
    @Ctx() context: ApillonApiContext,
    @Body() body: ApillonApiCreatePostDto,
  ) {
    body.space_uuid = body.hubUuid;
    return await this.socialService.createPost(context, body);
  }
}
