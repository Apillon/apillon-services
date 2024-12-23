import {
  BaseProjectQueryFilter,
  CacheKeyPrefix,
  CacheKeyTTL,
  CreatePostDto,
  CreateSpaceDto,
  DefaultPermission,
  DefaultUserRole,
  RoleGroup,
  SocialPostQueryFilter,
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
  Delete,
  Get,
  Param,
  Post,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { SocialService } from './social.service';
import { ProjectModifyGuard } from '../../guards/project-modify.guard';

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

  @Delete('spaces/:space_uuid')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async archiveSpace(
    @Ctx() context: DevConsoleApiContext,
    @Param('space_uuid') space_uuid: string,
  ) {
    return await this.socialService.archiveSpace(context, space_uuid);
  }

  @Patch('spaces/:space_uuid/activate')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async activateSpace(
    @Ctx() context: DevConsoleApiContext,
    @Param('space_uuid') space_uuid: string,
  ) {
    return await this.socialService.activateSpace(context, space_uuid);
  }

  @Post('spaces')
  @Validation({ dto: CreateSpaceDto })
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(ValidationGuard, AuthGuard, ProjectModifyGuard)
  async createSpace(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateSpaceDto,
  ) {
    return await this.socialService.createSpace(context, body);
  }

  @Get('posts')
  @Validation({ dto: SocialPostQueryFilter, validateFor: ValidateFor.QUERY })
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(ValidationGuard, AuthGuard)
  @CacheByProject({
    keyPrefix: CacheKeyPrefix.SOCIAL_POST_LIST,
    ttl: CacheKeyTTL.EXTRA_LONG,
  })
  async listPosts(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: SocialPostQueryFilter,
  ) {
    return await this.socialService.listPosts(context, query);
  }

  @Get('posts/:post_uuid')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getPost(
    @Ctx() context: DevConsoleApiContext,
    @Param('post_uuid') post_uuid: string,
  ) {
    return await this.socialService.getPost(context, post_uuid);
  }

  @Delete('posts/:post_uuid')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async archivePost(
    @Ctx() context: DevConsoleApiContext,
    @Param('post_uuid') post_uuid: string,
  ) {
    return await this.socialService.archivePost(context, post_uuid);
  }

  @Patch('posts/:post_uuid/activate')
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async activatePost(
    @Ctx() context: DevConsoleApiContext,
    @Param('post_uuid') post_uuid: string,
  ) {
    return await this.socialService.activatePost(context, post_uuid);
  }

  @Post('posts')
  @Validation({ dto: CreatePostDto })
  @UseGuards(ValidationGuard)
  @Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
  )
  @UseGuards(AuthGuard)
  async createPostInDefaultSpace(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreatePostDto,
  ) {
    return await this.socialService.createPost(context, body);
  }
}
