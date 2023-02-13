import type { Context } from 'aws-lambda/handler';
import { AuthenticationEventType } from '@apillon/lib';

import { VerificationMicroservice } from './modules/verification/verification.service';
import { IdentityMicroservice } from './modules/identity/identity.service';

export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    // VERIFICATION
    [AuthenticationEventType.IDENTITY_VERIFICATION]:
      VerificationMicroservice.verifyIdentity,
    // IDENTITY
    [AuthenticationEventType.SEND_VERIFICATION_EMAIL]:
      IdentityMicroservice.sendVerificationEmail,
    [AuthenticationEventType.GET_IDENTITY_GEN_PROCESS_STATE]:
      IdentityMicroservice.getIdentityGenProcessState,
    [AuthenticationEventType.GENERATE_IDENTITY]:
      IdentityMicroservice.generateIdentity,
    [AuthenticationEventType.GET_IDENTITY_USER_CREDENTIAL]:
      IdentityMicroservice.getUserIdentityCredential,
    [AuthenticationEventType.REVOKE_IDENTITY]:
      IdentityMicroservice.revokeIdentity,
    [AuthenticationEventType.GENERATE_DEV_RESOURCES]:
      IdentityMicroservice.generateDevResources,
    // SPORRAN
  };

  return await processors[event.eventName](event, context);
}
