import { ValidateFor } from '@apillon/lib';
import { Ctx, Validation } from '@apillon/modules-lib';
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthorizationApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';
import { AttestationService } from './attestation.service';
import { AttestationEmailDto } from './dtos/attestation-email.dto';
import { IdentityCreateDto } from './dtos/identity-create.dto';

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

  @Post('identity')
  @Validation({ dto: IdentityCreateDto })
  @UseGuards(ValidationGuard)
  async attestationGenerateDid(
    @Ctx() context: AuthorizationApiContext,
    @Body() body: any,
  ) {
    return await this.attestationService.generateIdentity(context, body);
  }

  @Get('state')
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

  @Get('credential')
  @Validation({ dto: AttestationEmailDto, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard)
  async attestationGetUserCredential(
    @Ctx() context: AuthorizationApiContext,
    @Query('email') email: string,
  ) {
    return await this.attestationService.getUserCredential(context, email);
  }

  @Post('dev/create-did')
  // NOTE: This is a dev handler!!! Create guards that prevent use of this if in
  // production ...
  // @Validation({ dto: DidCreateDto })
  // @UseGuards(ValidationGuard)
  async attestationGenerateDevDid(
    @Ctx() context: AuthorizationApiContext,
    @Body() body: any,
  ) {
    return await this.attestationService.generateDIDDocumentDEV(context, body);
  }
}
