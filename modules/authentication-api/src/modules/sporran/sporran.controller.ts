import { JwtTokenType, VerifyCredentialDto } from '@apillon/lib';
import { Ctx, Validation } from '@apillon/modules-lib';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthenticationApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';
import { RequestCredentialDto } from './dtos/message/request-credential.dto';
import { SubmitAttestationDto } from './dtos/message/submit-attestation.dto';
import { SubmitTermsDto } from './dtos/message/submit-terms.dto';
import { SporranSessionVerifyDto } from './dtos/sporran-session.dto';
import { SporranService } from './sporran.service';
import { AuthGuard } from '../../guards/auth.guard';

// NOTE: Messages are a way of communcation with the Sporran extension,
// once the session has been established

@Controller('sporran')
export class SporranController {
  constructor(private sporranService: SporranService) {}

  @Get('session-values')
  @UseGuards(AuthGuard(JwtTokenType.AUTH_SESSION))
  async sporranGetSessionValues(@Ctx() context: AuthenticationApiContext) {
    return await this.sporranService.getSessionValues(context);
  }

  @Post('verify-session')
  @Validation({ dto: SporranSessionVerifyDto })
  @UseGuards(ValidationGuard, AuthGuard(JwtTokenType.AUTH_SESSION))
  async sporranVerifySession(
    @Ctx() context: AuthenticationApiContext,
    @Body() body: any,
  ) {
    return await this.sporranService.verifySession(context, body);
  }

  @Post('message/submit-terms')
  @Validation({ dto: SubmitTermsDto })
  @UseGuards(ValidationGuard, AuthGuard(JwtTokenType.AUTH_SESSION))
  async sporranSubmitTerms(
    @Ctx() context: AuthenticationApiContext,
    @Body() body: SubmitTermsDto,
  ) {
    // Creates a request-credential message, which requests a credential presentation
    // from sporran
    return await this.sporranService.submitTerms(context, body);
  }

  @Post('message/request-credential')
  @Validation({ dto: RequestCredentialDto })
  @UseGuards(ValidationGuard, AuthGuard(JwtTokenType.AUTH_SESSION))
  async sporranRequestCredential(
    @Ctx() context: AuthenticationApiContext,
    @Body() body: RequestCredentialDto,
  ) {
    // Creates a request-credential message, which requests a credential presentation
    // from sporran
    return await this.sporranService.requestCredential(context, body);
  }

  @Post('message/verify-credential')
  @Validation({ dto: VerifyCredentialDto })
  @UseGuards(ValidationGuard, AuthGuard(JwtTokenType.AUTH_SESSION))
  async sporranVerifyAttestation(
    @Ctx() context: AuthenticationApiContext,
    @Body() body: VerifyCredentialDto,
  ) {
    return await this.sporranService.verifyCredential(context, body);
  }

  @Post('message/submit-attestation')
  @Validation({ dto: SubmitAttestationDto })
  @UseGuards(ValidationGuard, AuthGuard(JwtTokenType.AUTH_SESSION))
  async sporranSubmitAttestation(
    @Ctx() context: AuthenticationApiContext,
    @Body() body: SubmitAttestationDto,
  ) {
    // Creates a submit-attestation message, which injects a crednetial into Sporran
    return await this.sporranService.submitAttestation(context, body);
  }
}
