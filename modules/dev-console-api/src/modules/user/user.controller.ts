import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Context } from '../../context';
import { Ctx } from '../../decorators/context.decorator';
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
  async createUser(@Ctx() context: Context, @Body() body: CreateUserDto) {
    console.log(context);
    return true;
    //return await this.userService.createUser(body, req.context);
  }
}
