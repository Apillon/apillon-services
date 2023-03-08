import {
  AuthenticationMicroservice,
  RequestCredentialDto,
  SporranSessionVerifyDto,
  SubmitAttestationDto,
  SubmitTermsDto,
} from '@apillon/lib';
import { VerifyCredentialDto } from './dtos/message/verify-credential.dto';
import { Injectable } from '@nestjs/common';
import { AuthenticationApiContext } from '../../context';

@Injectable()
export class SporranService {
  async getSessionValues(context: AuthenticationApiContext): Promise<any> {
    return (await new AuthenticationMicroservice(context).getSessionValues())
      .data;
  }

  async verifySession(
    context: AuthenticationApiContext,
    body: SporranSessionVerifyDto,
  ): Promise<any> {
    return (
      await new AuthenticationMicroservice(context).sporranVerifySession(body)
    ).data;
  }

  async submitTerms(context: AuthenticationApiContext, body: SubmitTermsDto) {
    return (
      await new AuthenticationMicroservice(context).sporranSubmitTerms(body)
    ).data;
  }

  async submitAttestation(
    context: AuthenticationApiContext,
    body: SubmitAttestationDto,
  ) {
    return (
      await new AuthenticationMicroservice(context).sporranSubmitAttestation(
        body,
      )
    ).data;
  }

  async requestCredential(
    context: AuthenticationApiContext,
    body: RequestCredentialDto,
  ) {
    return (
      await new AuthenticationMicroservice(context).sporranRequestCredential(
        body,
      )
    ).data;
  }

  async verifyCredential(
    context: AuthenticationApiContext,
    body: VerifyCredentialDto,
  ) {
    return (
      await new AuthenticationMicroservice(context).sporranVerifyCredential(
        body,
      )
    ).data;
  }
}
