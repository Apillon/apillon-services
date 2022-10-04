import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Ctx, Validation } from 'at-lib';

import { DevConsoleApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';
import { LoginUserDto } from './dtos/login-user.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   *
   * Login & sign up routes.
   *
   */
  @Post('login')
  @Validation({ dto: LoginUserDto })
  @UseGuards(ValidationGuard)
  async login(
    @Body() body: LoginUserDto,
    @Ctx() context: DevConsoleApiContext,
  ) {
    return await this.authService.login(body, context);
  }
}
