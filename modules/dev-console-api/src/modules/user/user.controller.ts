import { Body, Controller, Get, Post, UseFilters, UseGuards } from '@nestjs/common';
import { Ctx, PermissionLevel, PermissionType, Validation, Permissions } from 'at-lib';
import { DevConsoleApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';
import { ValidationGuard } from '../../guards/validation.guard';
import { CreateUserDto } from './dtos/create-user.dto';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  getHello(): string {
    return 'users';
  }

  @Post('/register')
  @Validation({ dto: CreateUserDto })
  @UseGuards(ValidationGuard)
  async registerUser(@Ctx() context: DevConsoleApiContext, @Body() body: CreateUserDto) {
    return await this.userService.createUser(body, context);
  }

  @Post('/testAuth')
  @Permissions({ permission: 1, type: PermissionType.EXECUTE, level: PermissionLevel.OWN })
  @UseGuards(AuthGuard)
  async test(@Ctx() context: DevConsoleApiContext, @Body() body: any) {
    return true;
  }
}
