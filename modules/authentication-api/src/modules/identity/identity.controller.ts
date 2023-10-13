import { CaptchaGuard, Ctx, Validation } from '@apillon/modules-lib';
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthenticationApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';
import { AuthGuard } from '../../guards/auth.guard';
import { IdentityService } from './identity.service';
import { JwtTokenType } from '../../config/types';
import {
  BaseIdentityDto,
  IdentityCreateDto,
  IdentityDidRevokeDto,
  ValidateFor,
  VerificationEmailDto,
} from '@apillon/lib';

@Controller('identity')
export class IdentityController {
  constructor(private identityService: IdentityService) {}

  @Post('generate')
  @Validation({ dto: IdentityCreateDto })
  @UseGuards(ValidationGuard, AuthGuard(JwtTokenType.IDENTITY_VERIFICATION))
  async attestationGenerateIdentity(
    @Ctx() context: AuthenticationApiContext,
    @Body() body: IdentityCreateDto,
  ) {
    return await this.identityService.generateIdentity(context, body);
  }

  @Get('state/query')
  @Validation({ dto: BaseIdentityDto, validateFor: ValidateFor.QUERY })
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
  @Validation({ dto: BaseIdentityDto, validateFor: ValidateFor.QUERY })
  @UseGuards(ValidationGuard, AuthGuard(JwtTokenType.IDENTITY_VERIFICATION))
  async identityGetUserCredential(
    @Ctx() context: AuthenticationApiContext,
    @Query('email') email: string,
  ) {
    return await this.identityService.getUserIdentityCredential(context, email);
  }

  @Post('did/revoke')
  @Validation({ dto: IdentityDidRevokeDto })
  @UseGuards(ValidationGuard, AuthGuard(JwtTokenType.IDENTITY_VERIFICATION))
  async identityRevoke(
    @Ctx() context: AuthenticationApiContext,
    @Body() body: IdentityDidRevokeDto,
  ) {
    return await this.identityService.revokeIdentity(context, body);
  }

  @Post('verification/email')
  @Validation({ dto: VerificationEmailDto })
  @UseGuards(
    ValidationGuard,
    CaptchaGuard,
    AuthGuard(JwtTokenType.AUTH_SESSION),
  )
  async identityVerification(
    @Ctx() context: AuthenticationApiContext,
    @Body() body: VerificationEmailDto,
  ) {
    return await this.identityService.sendVerificationEmail(context, body);
  }
}
