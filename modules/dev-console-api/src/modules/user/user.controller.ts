import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  getHello(): string {
    return 'users';
  }

  /*@Post()
  async createUser(@Body() body: CreateUserDto, @Req() req: IRequest) {
    return await this.userService.createUser(body, req.context);
  }*/
}
