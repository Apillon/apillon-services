import { DefaultUserRole } from '@apillon/lib';
import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Ctx, Permissions } from '@apillon/modules-lib';
import { AuthGuard } from '../../../guards/auth.guard';
import { UserService } from './user.service';
import { DevConsoleApiContext } from '../../../context';

@Controller('admin-panel')
@Permissions({ role: DefaultUserRole.USER })
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('users')
  async listUsers() {
    return []; // TODO
  }

  @Get('users/:user_uuid')
  async getUser(
    @Ctx() context: DevConsoleApiContext,
    @Param('user_uuid') user_uuid: string,
  ) {
    return this.userService.getUser(context, user_uuid);
  }

  @Get('users/:user_uuid/projects')
  async getUserProjects(
    @Ctx() context: DevConsoleApiContext,
    @Param('user_uuid') user_uuid: string,
  ) {
    return []; // TODO
  }

  @Get('users/:user_uuid/logins')
  async getUserLogins(
    @Ctx() context: DevConsoleApiContext,
    @Param('user_uuid') user_uuid: string,
  ) {
    return []; // TODO
  }

  @Patch('users/:user_uuid')
  async updateUser(
    @Ctx() context: DevConsoleApiContext,
    @Param('user_uuid') user_uuid: string,
  ) {
    return;
  }
}
