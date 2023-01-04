import { Ctx, Validation } from '@apillon/modules-lib';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { AuthenticationApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';
import { VerificationIdentityDto } from './dto/verify-identity.dto';

@Controller('verification')
export class VerificationController {
  constructor(private verificationService: VerificationService) {}

  @Post('verify')
  @Validation({ dto: VerificationIdentityDto })
  @UseGuards(ValidationGuard)
  async verifyIdentity(
    @Ctx() context: AuthenticationApiContext,
    @Body() body: VerificationIdentityDto,
  ) {
    return await this.verificationService.verifyIdentity(context, body);
  }
}
