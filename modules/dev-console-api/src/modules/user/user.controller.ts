import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DefaultUserRole } from '@apillon/lib';
import { DevConsoleApiContext } from '../../context';
import { Ctx, Permissions, Validation } from '@apillon/modules-lib';
import { ValidationGuard } from '../../guards/validation.guard';
import { LoginUserDto } from './dtos/login-user.dto';
import { RegisterUserDto } from './dtos/register-user.dto';
import { ValidateEmailDto } from './dtos/validate-email.dto';
import { UserService } from './user.service';
import { AuthGuard } from '../../guards/auth.guard';
import { UpdateUserDto } from './dtos/update-user.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard)
  async getUserProfile(@Ctx() context: DevConsoleApiContext) {
    return await this.userService.getUserProfile(context);
  }

  @Patch('me')
  @Permissions({ role: DefaultUserRole.USER })
  @UseGuards(AuthGuard)
  @Validation({ dto: UpdateUserDto })
  @UseGuards(ValidationGuard)
  async updateUserProfile(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: UpdateUserDto,
  ) {
    return await this.userService.updateUserProfile(context, body);
  }

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
    return await this.userService.validateEmail(body);
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

  @Post('password-reset-request')
  @HttpCode(200)
  @Validation({ dto: ValidateEmailDto })
  @UseGuards(ValidationGuard)
  async passwordResetRequest(@Body() body: ValidateEmailDto) {
    return await this.userService.passwordResetRequest(body);
  }

  @Post('password-reset')
  @HttpCode(200)
  @Validation({ dto: ResetPasswordDto })
  @UseGuards(ValidationGuard)
  async resetPassword(@Body() body: ResetPasswordDto) {
    return await this.userService.resetPassword(body);
  }
}
