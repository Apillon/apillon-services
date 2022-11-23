import { ValidateFor } from '@apillon/lib';
import { Ctx, Validation } from '@apillon/modules-lib';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthorizationApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';
import { AttestationService } from './attestation.service';
import { AttestationEmailDto } from './dto/attestation-email.dto';
import { AttestationCreateDto } from './dto/attestation-create.dto';
import { AttestationTokenDto } from './dto/attestation-token.dto';
import { AttestDidCreateExtrinsicDto } from './dto/attestation-submittable-tx.dto';

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

  @Post('create-did')
  @Validation({ dto: AttestDidCreateExtrinsicDto })
  @UseGuards(ValidationGuard)
  async attestationGenerateDid(
    @Ctx() context: AuthorizationApiContext,
    @Body() body: AttestDidCreateExtrinsicDto,
  ) {
    return await this.attestationService.generateFullDid(context, body);
  }

  @Post('attest-claim')
  @Validation({ dto: AttestationCreateDto })
  @UseGuards(ValidationGuard)
  async attestationAttestClaim(
    @Ctx() context: AuthorizationApiContext,
    @Body() body: AttestationCreateDto,
  ) {
    return await this.attestationService.attestCreate(context, body);
  }

  @Get('verify/:token')
  @Validation({ dto: AttestationTokenDto })
  @UseGuards(ValidationGuard)
  async verifyIdentityEmail(
    @Ctx() context: AuthorizationApiContext,
    @Param('token') token: string,
  ) {
    return await this.attestationService.verifyIdentityEmail(context, token);
  }

  @Get('attest-state')
  @Validation({ dto: AttestationEmailDto, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard)
  async attestationGetIdentityState(
    @Ctx() context: AuthorizationApiContext,
    @Query('email') email: string,
  ) {
    return await this.attestationService.getUserAttestationState(
      context,
      email,
    );
  }
}
