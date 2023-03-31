import type { Context } from 'aws-lambda/handler';
import { AuthenticationEventType } from '@apillon/lib';

import { VerificationMicroservice } from './modules/verification/verification.service';
import { IdentityMicroservice } from './modules/identity/identity.service';
import { SporranMicroservice } from './modules/sporran/sporran.service';

/**
 * Processing lambda event with appropriate service function based on event name
 * @param event lambda event
 * @param context lambda context
 * @returns service response
 */
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
    [AuthenticationEventType.SPORRAN_GET_SESSION_VALUES]:
      SporranMicroservice.getSessionValues,
    [AuthenticationEventType.SPORRAN_SUBMIT_TERMS]:
      SporranMicroservice.submitTerms,
    [AuthenticationEventType.SPORRAN_SUBMIT_ATTESTATION]:
      SporranMicroservice.submitAttestation,
    [AuthenticationEventType.SPORRAN_REQUEST_CREDENTIAL]:
      SporranMicroservice.requestCredential,
    [AuthenticationEventType.SPORRAN_VERIFY_SESSION]:
      SporranMicroservice.verifySession,
    [AuthenticationEventType.SPORRAN_VERIFY_CREDENTIAL]:
      SporranMicroservice.verifyCredential,
  };

  return await processors[event.eventName](event, context);
}
