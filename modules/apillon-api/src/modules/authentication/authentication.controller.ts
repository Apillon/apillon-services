import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Ctx, Validation } from '@apillon/modules-lib';
import { ApillonApiContext } from '../../context';
import { AuthService } from './authentication.service';
import { ValidationGuard } from '../../guards/validation.guard';
import { ValidateFor } from '@apillon/lib';
import { VerifyLoginDto } from '@apillon/lib';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('session-token')
  async generateSessionToken(@Ctx() context: ApillonApiContext) {
    return await this.authService.generateSessionToken(context);
  }

  @Get('verify-login')
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
