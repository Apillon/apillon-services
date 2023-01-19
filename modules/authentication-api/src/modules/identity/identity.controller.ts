import { ValidateFor } from '@apillon/lib';
import { Ctx, Validation } from '@apillon/modules-lib';
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthenticationApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';
import { AuthGuard } from '../../guards/auth.guard';
import { IdentityService } from './identity.service';
import { AttestationEmailDto } from './dtos/identity-email.dto';
import { IdentityCreateDto } from './dtos/identity-create.dto';
import { JwtTokenType } from '../../config/types';

@Controller('identity')
export class IdentityController {
  constructor(private identityService: IdentityService) {}

  @Post('start')
  @Validation({ dto: AttestationEmailDto })
  @UseGuards(ValidationGuard)
  async identityGenStart(
    @Ctx() context: AuthenticationApiContext,
    @Body() body: AttestationEmailDto,
  ) {
    return await this.identityService.startUserIdentityGenProcess(
      context,
      body,
    );
  }

  @Post('generate')
  @Validation({ dto: IdentityCreateDto })
  @UseGuards(
    ValidationGuard,
    AuthGuard(JwtTokenType.IDENTITY_ATTESTATION_PROCESS),
  )
  async attestationGenerateDid(
    @Ctx() context: AuthenticationApiContext,
    @Body() body: any,
  ) {
    return await this.identityService.generateIdentity(context, body);
  }

  @Get('state')
  @Validation({ dto: AttestationEmailDto, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard)
  async attestationGetIdentityState(
    @Ctx() context: AuthenticationApiContext,
    @Query('email') email: string,
  ) {
    return await this.identityService.getUserIdentityGenState(context, email);
  }

  @Get('credential')
  @Validation({ dto: AttestationEmailDto, validateFor: ValidateFor.QUERY })
  @UseGuards(
    ValidationGuard,
    AuthGuard(JwtTokenType.IDENTITY_ATTESTATION_PROCESS),
  )
  async attestationGetUserCredential(
    @Ctx() context: AuthenticationApiContext,
    @Query('email') email: string,
  ) {
    return await this.identityService.getUserCredential(context, email);
  }

  @Post('dev/create-did')
  // NOTE: This is a dev handler!!! Create guards that prevent use of this if in
  // production ...
  // @Validation({ dto: DidCreateDto })
  // @UseGuards(ValidationGuard)
  async attestationGenerateDevDid(
    @Ctx() context: AuthenticationApiContext,
    @Body() body: any,
  ) {
    return await this.identityService.generateDIDDocumentDEV(context, body);
  }
}
