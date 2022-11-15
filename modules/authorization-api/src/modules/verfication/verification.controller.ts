import { Ctx } from '@apillon/modules-lib';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { AuthorizationApiContext } from '../../context';
import { AuthGuard } from '../../guards/auth.guard';

@Controller('verification')
export class VerificationController {
  constructor(private verificationService: VerificationService) {}

  @Get('email')
  async verificationEmail(
    @Ctx() context: AuthorizationApiContext,
    @Param('email') email: string,
  ) {
    console.log('TESTTT ', email);
    return await this.verificationService.sendVerificationEmail(context, email);
  }
}
