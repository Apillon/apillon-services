import { Ctx, Validation } from '@apillon/modules-lib';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthorizationApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';
import { AttestationService } from './attestation.service';
import { AttestationEmailDto } from './dto/attestation-email.dto';

@Controller('attestation')
export class AttestationController {
  constructor(private attestationService: AttestationService) {}

  @Post('start')
  @Validation({ dto: AttestationEmailDto })
  @UseGuards(ValidationGuard)
  async attestationStart(
    @Ctx() context: AuthorizationApiContext,
    @Body() body: AttestationEmailDto,
  ) {
    return await this.attestationService.startUserAttestationProcess(
      context,
      body,
    );
  }

  @Get('verify/:token')
  @Validation({ dto: AttestationEmailDto })
  @UseGuards(ValidationGuard)
  async verifyIdentityEmail(
    @Ctx() context: AuthorizationApiContext,
    @Param('token') token: string,
  ) {
    return await this.attestationService.verifyIdentityEmail(context, token);
  }
}
