import { Injectable } from '@nestjs/common';
import {
  AuthenticationMicroservice,
  IdentityCreateDto,
  IdentityDidRevokeDto,
  VerificationEmailDto,
} from '@apillon/lib';
import { AuthenticationApiContext } from '../../context';

@Injectable()
export class IdentityService {
  async sendVerificationEmail(
    context: AuthenticationApiContext,
    body: VerificationEmailDto,
  ): Promise<any> {
    return (
      await new AuthenticationMicroservice(context).sendVerificationEmail(body)
    ).data;
  }

  async getIdentityGenProcessState(
    context: AuthenticationApiContext,
    email: string,
  ): Promise<any> {
    return (
      await new AuthenticationMicroservice(context).getIdentityGenProcessState(
        email,
      )
    ).data;
  }

  async generateIdentity(
    context: AuthenticationApiContext,
    body: IdentityCreateDto,
  ): Promise<any> {
    return (
      await new AuthenticationMicroservice(context).generateIdentity(body)
    ).data;
  }

  async getUserIdentityCredential(
    context: AuthenticationApiContext,
    email: string,
  ) {
    return (
      await new AuthenticationMicroservice(context).getUserIdentityCredential(
        email,
      )
    ).data;
  }

  async revokeIdentity(
    context: AuthenticationApiContext,
    body: IdentityDidRevokeDto,
  ) {
    return (await new AuthenticationMicroservice(context).revokeIdentity(body))
      .data;
  }
}
