import { Injectable } from '@nestjs/common';
import { AuthenticationApiContext } from '../../context';

import {
  AuthenticationMicroservice,
  VerificationIdentityDto,
} from '@apillon/lib';

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
