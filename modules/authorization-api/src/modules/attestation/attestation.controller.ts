import { Ctx, Validation } from '@apillon/modules-lib';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthorizationApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';
import { AttestationService } from './attestation.service';
import { AttestationEmailDto } from './dto/attestation-email.dto';

@Controller('attestation')
export class AttestationController {
  constructor(private attestationService: AttestationService) {}

  @Post('verify-email')
  @Validation({ dto: AttestationEmailDto })
  @UseGuards(ValidationGuard)
  async verificationEmail(
    @Ctx() context: AuthorizationApiContext,
    @Body() body: AttestationEmailDto,
  ) {
    return await this.attestationService.startUserAttestationProcess(
      context,
      body,
    );
  }
}
