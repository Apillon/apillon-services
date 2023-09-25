import { Injectable } from '@nestjs/common';

import { AuthenticationMicroservice } from '@apillon/lib';

import { AuthenticationApiContext } from '../../context';

// Dtos
import { IdentityCreateDto } from './dtos/identity-create.dto';
import { IdentityDidRevokeDto } from './dtos/identity-did-revoke.dto';
import { VerificationEmailDto } from './dtos/identity-verification-email.dto';

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
