import {
  BaseProjectQueryFilter,
  BaseQueryFilter,
  CacheKeyPrefix,
  CacheKeyTTL,
  CreatePostDto,
  CreateSpaceDto,
  DefaultPermission,
  DefaultUserRole,
  RoleGroup,
  ValidateFor,
} from '@apillon/lib';
import {
  CacheByProject,
  Ctx,
  Permissions,
  Validation,
} from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { SocialService } from './social.service';

@Controller('social')
@Permissions({ permission: DefaultPermission.SOCIAL })
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get('spaces')
  @Validation({ dto: BaseProjectQueryFilter, validateFor: ValidateFor.QUERY })
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(ValidationGuard, AuthGuard)
  @CacheByProject({
    keyPrefix: CacheKeyPrefix.SOCIAL_SPACE_LIST,
    ttl: CacheKeyTTL.EXTRA_LONG,
  })
  async listSpaces(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: BaseProjectQueryFilter,
  ) {
    return await this.socialService.listSpaces(context, query);
  }

  @Get('spaces/:space_uuid')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getSpace(
    @Ctx() context: DevConsoleApiContext,
    @Param('space_uuid') space_uuid: string,
  ) {
    return await this.socialService.getSpace(context, space_uuid);
  }

  @Post('spaces')
  @Validation({ dto: CreateSpaceDto })
  @UseGuards(ValidationGuard)
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async createSpace(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateSpaceDto,
  ) {
    return await this.socialService.createSpace(context, body);
  }

  @Get('spaces/:space_uuid/posts')
  @Validation({ dto: BaseQueryFilter, validateFor: ValidateFor.QUERY })
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(ValidationGuard, AuthGuard)
  @CacheByProject({
    keyPrefix: CacheKeyPrefix.SOCIAL_POST_LIST,
    ttl: CacheKeyTTL.EXTRA_LONG,
  })
  async listPosts(
    @Ctx() context: DevConsoleApiContext,
    @Param('space_uuid') space_uuid: string,
    @Query() query: BaseQueryFilter,
  ) {
    return await this.socialService.listPosts(context, space_uuid, query);
  }

  @Get('spaces/:space_uuid/posts/:post_uuid')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getPost(
    @Ctx() context: DevConsoleApiContext,
    @Param('post_uuid') post_uuid: string,
  ) {
    return await this.socialService.getPost(context, post_uuid);
  }

  @Post('spaces/:space_uuid/posts')
  @Validation({ dto: CreatePostDto })
  @UseGuards(ValidationGuard)
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async createPost(
    @Ctx() context: DevConsoleApiContext,
    @Param('space_uuid') space_uuid: string,
    @Body() body: CreatePostDto,
  ) {
    body.space_uuid = space_uuid;
    return await this.socialService.createPost(context, body);
  }
}
