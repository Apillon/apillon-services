import { Body, Controller, Get, Post, UseFilters, UseGuards } from '@nestjs/common';
import { Ctx, Validation } from 'at-lib';
import { DevConsoleApiContext } from '../../context';
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

  @Post()
  @Validation({ dto: CreateUserDto })
  @UseGuards(ValidationGuard)
  async createUser(@Ctx() context: DevConsoleApiContext, @Body() body: CreateUserDto) {
    return await this.userService.createUser(body, context);
  }
}
