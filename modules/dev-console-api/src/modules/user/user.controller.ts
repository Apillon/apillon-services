import { Body, Controller, Get, Post, UseFilters } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { Ctx } from '../../decorators/context.decorator';
import { HttpExceptionFilter } from '../../filters/http-exception.filter';
import { CreateUserDto } from './dtos/create-user.dto';
import { UserService } from './user.service';

@Controller('user')
@UseFilters(new HttpExceptionFilter())
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  getHello(): string {
    return 'users';
  }

  @Post()
  async createUser(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: CreateUserDto,
  ) {
    return await this.userService.createUser(body, context);
  }
}
