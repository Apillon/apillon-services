import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DefaultUserRole, SerializeFor, UserWalletAuthDto } from '@apillon/lib';
import { DevConsoleApiContext } from '../../context';
import {
  Ctx,
  getDiscordAuthURL,
  Permissions,
  Validation,
  CaptchaGuard,
} from '@apillon/modules-lib';
import { ValidationGuard } from '../../guards/validation.guard';
import { LoginUserDto } from './dtos/login-user.dto';
import { LoginUserKiltDto } from './dtos/login-user-kilt.dto';
import { RegisterUserDto } from './dtos/register-user.dto';
import { ValidateEmailDto } from './dtos/validate-email.dto';
import { UserService } from './user.service';
import { AuthGuard } from '../../guards/auth.guard';
import { UpdateUserDto } from './dtos/update-user.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { DiscordCodeDto } from './dtos/discord-code.dto';
import { Headers } from '@nestjs/common';

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
  @Validation({ dto: UpdateUserDto })
  @UseGuards(AuthGuard, ValidationGuard)
  async updateUserProfile(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: UpdateUserDto,
  ) {
    return (await this.userService.updateUserProfile(context, body)).serialize(
      SerializeFor.PROFILE,
    );
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

  @Post('login-kilt')
  @Validation({ dto: LoginUserKiltDto })
  @UseGuards(ValidationGuard)
  async loginWithKilt(
    @Body() body: LoginUserKiltDto,
    @Ctx() context: DevConsoleApiContext,
  ) {
    return await this.userService.loginWithKilt(body, context);
  }

  @Post('validate-email')
  @Validation({ dto: ValidateEmailDto })
  @UseGuards(ValidationGuard)
  async validateEmail(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: ValidateEmailDto,
    @Headers('cloudfront-viewer-country') country: string,
  ) {
    if (country) {
      body.metadata = { ...body.metadata, country };
    }
    return await this.userService.validateEmail(context, body);
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
  @UseGuards(ValidationGuard, CaptchaGuard)
  async passwordResetRequest(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: ValidateEmailDto,
  ) {
    return await this.userService.passwordResetRequest(context, body);
  }

  @Post('password-reset')
  @HttpCode(200)
  @Validation({ dto: ResetPasswordDto })
  @UseGuards(ValidationGuard)
  async resetPassword(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: ResetPasswordDto,
  ) {
    return await this.userService.resetPassword(context, body);
  }

  @Post('discord-connect')
  @Validation({ dto: DiscordCodeDto })
  @UseGuards(ValidationGuard, AuthGuard)
  async connectDiscord(
    @Ctx() context: DevConsoleApiContext,
    @Body() body: DiscordCodeDto,
  ) {
    return await this.userService.connectDiscord(context, body);
  }

  @Post('discord-disconnect')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  async disconnectDiscord(@Ctx() context: DevConsoleApiContext) {
    return await this.userService.disconnectDiscord(context);
  }

  @Get('discord-url')
  @UseGuards(AuthGuard)
  async getDiscordUrl() {
    return getDiscordAuthURL();
  }

  @Get('oauth-links')
  @UseGuards(AuthGuard)
  async getOauthLinks(@Ctx() context: DevConsoleApiContext) {
    return await this.userService.getOauthLinks(context);
  }

  @Get('auth-msg')
  getAuthMsg(): any {
    return this.userService.getAuthMessage();
  }

  @Post('login/wallet')
  @HttpCode(200)
  @Validation({ dto: UserWalletAuthDto })
  @UseGuards(ValidationGuard)
  loginWithWallet(
    @Body() body: UserWalletAuthDto,
    @Ctx() context: DevConsoleApiContext,
  ): any {
    return this.userService.loginWithWallet(body, context);
  }

  @Post('wallet-connect')
  @HttpCode(200)
  @Validation({ dto: UserWalletAuthDto })
  @UseGuards(ValidationGuard, AuthGuard)
  walletConnect(
    @Body() body: UserWalletAuthDto,
    @Ctx() context: DevConsoleApiContext,
  ): any {
    return this.userService.walletConnect(body, context);
  }

  @Get('/oauth-session')
  getOauthSession() {
    return this.userService.getOauthSession();
  }
}
