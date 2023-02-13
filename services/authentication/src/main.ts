import type { Context } from 'aws-lambda/handler';
import { AuthenticationEventType } from '@apillon/lib';
import { VerificationMicroservice } from './modules/verification/verification.service';

export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [AuthenticationEventType.IDENTITY_VERIFICATION]:
      VerificationMicroservice.verifyIdentity,
  };

  return await processors[event.eventName](event, context);
}
