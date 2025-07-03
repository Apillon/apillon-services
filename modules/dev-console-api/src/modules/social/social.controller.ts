import {
  BaseProjectQueryFilter,
  CacheKeyPrefix,
  CacheKeyTTL,
  CreatePostDto,
  CreateSpaceDto,
  DefaultPermission,
  DefaultUserRole,
  HttpException,
  HttpStatus,
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
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { SocialService } from './social.service';
import { ProjectModifyGuard } from '../../guards/project-modify.guard';

const SOCIAL_MODULE_DEPRECATED = 'Social module has been deprecated';

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
    throw new HttpException(SOCIAL_MODULE_DEPRECATED, HttpStatus.GONE);
  }

  @Get('spaces/:space_uuid')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getSpace(
    @Ctx() context: DevConsoleApiContext,
    @Param('space_uuid') space_uuid: string,
  ) {
    throw new HttpException(SOCIAL_MODULE_DEPRECATED, HttpStatus.GONE);
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
    throw new HttpException(SOCIAL_MODULE_DEPRECATED, HttpStatus.GONE);
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
    throw new HttpException(SOCIAL_MODULE_DEPRECATED, HttpStatus.GONE);
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
    throw new HttpException(SOCIAL_MODULE_DEPRECATED, HttpStatus.GONE);
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
    throw new HttpException(SOCIAL_MODULE_DEPRECATED, HttpStatus.GONE);
  }

  @Get('posts/:post_uuid')
  @Permissions({ role: RoleGroup.ProjectAccess })
  @UseGuards(AuthGuard)
  async getPost(
    @Ctx() context: DevConsoleApiContext,
    @Param('post_uuid') post_uuid: string,
  ) {
    throw new HttpException(SOCIAL_MODULE_DEPRECATED, HttpStatus.GONE);
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
    throw new HttpException(SOCIAL_MODULE_DEPRECATED, HttpStatus.GONE);
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
    throw new HttpException(SOCIAL_MODULE_DEPRECATED, HttpStatus.GONE);
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
    throw new HttpException(SOCIAL_MODULE_DEPRECATED, HttpStatus.GONE);
  }
}
