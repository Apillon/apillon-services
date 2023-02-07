import { ValidateFor } from '@apillon/lib';
import { Ctx, Validation } from '@apillon/modules-lib';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthenticationApiContext } from '../../context';
import { ValidationGuard } from '../../guards/validation.guard';
import { RequestCredentialDto } from './dtos/message/request-credential.dto';
import { SubmitAttestationDto } from './dtos/message/submit-attestation.dto';
import { SubmitTermsDto } from './dtos/message/submit-terms.dto';
import { SporranSessionVerifyDto } from './dtos/sporran-session.dto';
import { SporranService } from './sporran.service';

// NOTE: Messages are a way of communcation with the Sporran extension,
// once the session has been established

@Controller('sporran')
export class SporranController {
  constructor(private sporranService: SporranService) {}

  @Get('session-values')
  async sporranGetSessionValues(@Ctx() context: AuthenticationApiContext) {
    return await this.sporranService.getSessionValues(context);
  }

  @Post('verify-session')
  @Validation({
    dto: SporranSessionVerifyDto,
    validateFor: ValidateFor.QUERY,
  })
  async sporranVerifySession(
    @Ctx() context: AuthenticationApiContext,
    @Body() body: any,
  ) {
    return await this.sporranService.verifySession(context, body);
  }

  @Post('message/submit-terms')
  @Validation({
    dto: SubmitTermsDto,
  })
  @UseGuards(ValidationGuard)
  async sporranSubmitTerms(
    @Ctx() context: AuthenticationApiContext,
    @Body() body: SubmitTermsDto,
  ) {
    // Creates a request-credential message, which requests a credential presentation
    // from sporran
    return await this.sporranService.submitTerms(context, body);
  }

  @Post('message/request-credential')
  @Validation({
    dto: RequestCredentialDto,
  })
  @UseGuards(ValidationGuard)
  async sporranRequestCredential(
    @Ctx() context: AuthenticationApiContext,
    @Body() body: RequestCredentialDto,
  ) {
    // Creates a request-credential message, which requests a credential presentation
    // from sporran
    return await this.sporranService.requestCredential(context, body);
  }

  @Post('message/submit-attestation')
  @Validation({
    dto: SubmitAttestationDto,
  })
  @UseGuards(ValidationGuard)
  async sporranSubmitAttestation(
    @Ctx() context: AuthenticationApiContext,
    @Body() body: SubmitAttestationDto,
  ) {
    // Creates a submit-attestation message, which injects a crednetial into Sporran
    return await this.sporranService.submitAttestation(context, body);
  }
}
