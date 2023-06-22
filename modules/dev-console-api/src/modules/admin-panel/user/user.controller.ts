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
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import { AuthGuard } from '../../../guards/auth.guard';
import { UserService } from './user.service';
import { DevConsoleApiContext } from '../../../context';
import { ValidationGuard } from '../../../guards/validation.guard';
import { UserQueryFilter } from './dtos/user-query-filter.dto';

@Controller('admin-panel/users')
@Permissions({ role: DefaultUserRole.USER })
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
    @Param('user_uuid', ParseUUIDPipe) user_uuid: string,
  ) {
    // TODO: projects, quotas, logins
    return this.userService.getUser(context, user_uuid);
  }

  @Get(':user_uuid/projects')
  async getUserProjects(
    @Ctx() context: DevConsoleApiContext,
    @Param('user_uuid', ParseUUIDPipe) user_uuid: string,
  ) {
    return []; // TODO
  }

  @Get(':user_uuid/logins')
  async getUserLogins(
    @Ctx() context: DevConsoleApiContext,
    @Param('user_uuid', ParseUUIDPipe) user_uuid: string,
  ) {
    return []; // TODO
  }

  @Patch(':user_uuid')
  async updateUser(
    @Ctx() context: DevConsoleApiContext,
    @Param('user_uuid', ParseUUIDPipe) user_uuid: string,
  ) {
    return;
  }
}
