import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiKeyPermissions, Ctx, Validation } from '@apillon/modules-lib';
import { ApillonApiContext } from '../../context';
import { AuthService } from './authentication.service';
import { ValidationGuard } from '../../guards/validation.guard';
import {
  AttachedServiceType,
  DefaultApiKeyRole,
  ValidateFor,
} from '@apillon/lib';
import { VerifyLoginDto } from '@apillon/lib';
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

  @Get('verify-login')
  @ApiKeyPermissions({
    role: DefaultApiKeyRole.KEY_EXECUTE,
    serviceType: AttachedServiceType.AUTHENTICATION,
  })
  @UseGuards(AuthGuard)
  @Validation({
    dto: VerifyLoginDto,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(ValidationGuard)
  async verifyLogin(
    @Ctx() context: ApillonApiContext,
    @Query() query: VerifyLoginDto,
  ) {
    return await this.authService.verifyLogin(context, query);
  }
}
