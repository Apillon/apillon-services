import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Ctx, Validation } from 'at-lib';
import { DevConsoleApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';
import { LoginUserDto } from './dtos/login-user.dto';
import { RegisterUserDto } from './dtos/register-user.dto';
import { ValidateEmailDto } from './dtos/validate-email.dto';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // @Get()
  // getHello(): string {
  //   return 'users';
  // }

  @Post('login')
  @Validation({ dto: LoginUserDto })
  @UseGuards(ValidationGuard)
  async login(
    @Body() body: LoginUserDto,
    @Ctx() context: DevConsoleApiContext,
  ) {
    return await this.userService.login(body, context);
  }

  @Post('validate-email')
  @Validation({ dto: ValidateEmailDto })
  @UseGuards(ValidationGuard)
  async validateEmail(@Body() body: ValidateEmailDto) {
    await this.userService.validateEmail(body);
  }

  @Post('register')
  @Validation({ dto: RegisterUserDto })
  @UseGuards(ValidationGuard)
  async registerUser(
    @Body() body: RegisterUserDto,
    @Ctx() context: DevConsoleApiContext,
  ) {
    return await this.userService.registerUser(body, context);
  }
}
