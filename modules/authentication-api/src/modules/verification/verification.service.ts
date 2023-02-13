import { Injectable } from '@nestjs/common';
import { AuthenticationApiContext } from '../../context';
import { VerificationIdentityDto } from './dtos/verify-identity.dto';

import { AuthenticationMicroservice } from '@apillon/lib';

@Injectable()
export class VerificationService {
  async verifyIdentity(
    context: AuthenticationApiContext,
    body: VerificationIdentityDto,
  ) {
    return (await new AuthenticationMicroservice(context).verifyIdentity(body))
      .data;
  }
}
