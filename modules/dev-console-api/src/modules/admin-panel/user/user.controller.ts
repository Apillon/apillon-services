import { DefaultUserRole, ValidateFor } from '@apillon/lib';
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserLoginsQueryFilterDto } from '@apillon/lib';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import { AuthGuard } from '../../../guards/auth.guard';
import { UserService } from './user.service';
import { DevConsoleApiContext } from '../../../context';
import { ValidationGuard } from '../../../guards/validation.guard';
import { UserQueryFilter } from './dtos/user-query-filter.dto';
import { UserProjectsQueryFilter } from './dtos/user-projects-query-filter.dto';
import { UUID } from 'crypto';

@Controller('admin-panel/users')
@Permissions({ role: DefaultUserRole.ADMIN })
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @Validation({ dto: UserQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async listUsers(
    @Ctx() context: DevConsoleApiContext,
    @Query() query: UserQueryFilter,
  ) {
    return this.userService.getUserList(context, query);
  }

  @Get(':user_uuid')
  async getUser(
    @Ctx() context: DevConsoleApiContext,
    @Param('user_uuid', ParseUUIDPipe) user_uuid: UUID,
  ) {
    // TODO: projects, quotas, logins
    return this.userService.getUser(context, user_uuid);
  }

  @Get(':user_uuid/projects')
  @Validation({ dto: UserProjectsQueryFilter, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async getUserProjects(
    @Ctx() context: DevConsoleApiContext,
    @Param('user_uuid', ParseUUIDPipe) user_uuid: UUID,
    @Query() query: UserProjectsQueryFilter,
  ) {
    return this.userService.getUserProjects(context, user_uuid, query);
  }

  @Get(':user_uuid/logins')
  @Validation({ dto: UserLoginsQueryFilterDto, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard)
  async getUserLogins(
    @Ctx() context: DevConsoleApiContext,
    @Param('user_uuid', ParseUUIDPipe) user_uuid: UUID,
    @Query() query: UserLoginsQueryFilterDto,
  ) {
    return this.userService.getUserLogins(context, user_uuid, query);
  }

  @Patch(':user_uuid')
  async updateUser(
    @Ctx() context: DevConsoleApiContext,
    @Param('user_uuid', ParseUUIDPipe) user_uuid: UUID,
  ) {
    return;
  }
}
