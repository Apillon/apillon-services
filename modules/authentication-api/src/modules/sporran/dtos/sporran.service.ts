import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthenticationApiContext } from '../../../context';

@Injectable()
export class SporranService {
  async getSessionValues(context: AuthenticationApiContext): Promise<any> {
    const challenge = randomUUID();
    return {
      challenge: challenge,
    };
  }

  async verifySession(
    context: AuthenticationApiContext,
    body: any,
  ): Promise<any> {
    const challenge = randomUUID();
    return true;
  }
}
