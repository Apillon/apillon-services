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
import { DevEnvGuard } from '../../guards/dev-env.guard';
import { IdentityDidRevokeDto } from './dtos/identity-did-revoke.dto';

@Controller('identity')
export class IdentityController {
  constructor(private identityService: IdentityService) {}

  @Post('generate/start-process')
  @Validation({ dto: AttestationEmailDto })
  @UseGuards(ValidationGuard)
  async identityProcessStart(
    @Ctx() context: AuthenticationApiContext,
    @Body() body: AttestationEmailDto,
  ) {
    return await this.identityService.startUserIdentityProcess(context, body);
  }

  @Post('generate/identity')
  @Validation({ dto: IdentityCreateDto })
  @UseGuards(ValidationGuard, AuthGuard(JwtTokenType.IDENTITY_PROCESS))
  async attestationGenerateIdentity(
    @Ctx() context: AuthenticationApiContext,
    @Body() body: any,
  ) {
    return await this.identityService.generateIdentity(context, body);
  }

  @Get('generate/query/state')
  @Validation({ dto: AttestationEmailDto, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard)
  async attestationGetIdentityState(
    @Ctx() context: AuthenticationApiContext,
    @Query('email') email: string,
  ) {
    return await this.identityService.getIdentityGenProcessState(
      context,
      email,
    );
  }

  @Get('credential/query')
  @Validation({ dto: AttestationEmailDto, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard(JwtTokenType.IDENTITY_PROCESS))
  async identityGetUserCredential(
    @Ctx() context: AuthenticationApiContext,
    @Query('email') email: string,
  ) {
    return await this.identityService.getUserIdentityCredential(context, email);
  }

  @Get('credential/restore')
  @Validation({ dto: AttestationEmailDto, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard)
  async identityRestoreCredential(
    @Ctx() context: AuthenticationApiContext,
    @Query('email') email: string,
  ) {
    return await this.identityService.restoreCredential(context, email);
  }

  @Post('did/revoke')
  @Validation({ dto: IdentityDidRevokeDto, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard(JwtTokenType.IDENTITY_PROCESS))
  async identityRevoke(
    @Ctx() context: AuthenticationApiContext,
    @Body() body: any,
  ) {
    return await this.identityService.revokeIdentity(context, body);
  }

  @Post('dev/create-did')
  // NOTE: If this is used in production, there will be blood!!!
  @UseGuards(DevEnvGuard)
  async attestationGenerateDevDid(
    @Ctx() context: AuthenticationApiContext,
    @Body() body: any,
  ) {
    return await this.identityService.generateDevResources(context, body);
  }
}
