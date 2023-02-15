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

  async generateDevResources(context: AuthenticationApiContext, body: any) {
    // Used to issue did documents to test accounts -> Since the peregrine faucet
    // only allows 100PILT token per account, we need a new one everytime funds
    // are depleted ...
    // NOTE: Use this function to generate a testnet DID
    return (
      await new AuthenticationMicroservice(context).generateDevResources(body)
    ).data;
  }
}
