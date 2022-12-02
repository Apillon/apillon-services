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
import { AttestationEmailDto } from './dtos/attestation-email.dto';
import { AttestationCreateDto } from './dtos/attestation-create.dto';
import { AttestationTokenDto } from './dtos/attestation-token.dto';
import { DidCreateDto } from './dtos/attestation-did-create.dto';

@Controller('attestation')
export class AttestationController {
  constructor(private attestationService: AttestationService) {}

  @Post('start')
  // TODO: Possibly split logic -> Attestation start is not really part of the
  // attestation module, is it? It's more of a session / state handler of
  // the authentication module
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
  @Validation({ dto: DidCreateDto })
  @UseGuards(ValidationGuard)
  async attestationGenerateDid(
    @Ctx() context: AuthorizationApiContext,
    @Body() body: any,
  ) {
    return await this.attestationService.generateFullDid(context, body);
  }

  @Post('attest-email')
  @Validation({ dto: AttestationCreateDto })
  @UseGuards(ValidationGuard)
  async attestationAttestClaim(
    @Ctx() context: AuthorizationApiContext,
    @Body() body: AttestationCreateDto,
  ) {
    return await this.attestationService.createAttestation(context, body);
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
