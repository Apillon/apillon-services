import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiKeyPermissions, Ctx } from '@apillon/modules-lib';
import { ApillonApiContext } from '../../context';
import { AuthService } from './authentication.service';
import { AttachedServiceType, DefaultApiKeyRole } from '@apillon/lib';
import { AuthGuard } from '../../guards/auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('session-token')
  @ApiKeyPermissions(
    {
      role: DefaultApiKeyRole.KEY_EXECUTE,
      serviceType: AttachedServiceType.AUTHENTICATION,
    },
    {
      role: DefaultApiKeyRole.KEY_EXECUTE,
      serviceType: AttachedServiceType.SYSTEM,
    },
  )
  @UseGuards(AuthGuard)
  async generateSessionToken(@Ctx() context: ApillonApiContext) {
    return await this.authService.generateSessionToken(context);
  }

  @Post('verify-login')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.AUTHENTICATION,
  })
  @UseGuards(AuthGuard)
  async verifyLogin(
    @Ctx() context: ApillonApiContext,
    @Body() body: { token: string },
  ) {
    return await this.authService.verifyLogin(context, body.token);
  }
}
