import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class SporranService {
  async getSessionValues(
    context: AuthenticationApiContext,
    body: AttestationEmailDto,
  ): Promise<any> {
    const challenge = randomUUID();
    return {
      challenge: challenge,
    };
  }

  async verifySession(
    context: AuthenticationApiContext,
    body: AttestationEmailDto,
  ): Promise<any> {
    const challenge = randomUUID();
    return true;
  }
}
