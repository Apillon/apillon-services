import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Ctx, Validation } from '@apillon/modules-lib';
import { ApillonApiContext } from '../../context';
import { AuthService } from './authentication.service';
import { ValidationGuard } from '../../guards/validation.guard';
import { ValidateFor } from '@apillon/lib';
import { VerifySessionDto } from './dtos/verify-session.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('session')
  async getSession(@Ctx() context: ApillonApiContext) {
    return await this.authService.generateSession(context);
  }

  @Get('verify-session')
  @Validation({
    dto: VerifySessionDto,
    validateFor: ValidateFor.QUERY,
  })
  @UseGuards(ValidationGuard)
  async verifySession(
    @Ctx() context: ApillonApiContext,
    @Query() query: VerifySessionDto,
  ) {
    return await this.authService.verifySession(context, query);
  }
}
