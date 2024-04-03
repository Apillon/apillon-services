import { AuthenticationEventType, Context } from '@apillon/lib';
import { VerificationService } from './modules/verification/verification.service';
import { IdentityService } from './modules/identity/identity.service';
import { SporranService } from './modules/sporran/sporran.service';

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
      VerificationService.verifyIdentity,
    // IDENTITY
    [AuthenticationEventType.SEND_VERIFICATION_EMAIL]:
      IdentityService.sendVerificationEmail,
    [AuthenticationEventType.GET_IDENTITY_GEN_PROCESS_STATE]:
      IdentityService.getIdentityGenProcessState,
    [AuthenticationEventType.GENERATE_IDENTITY]:
      IdentityService.generateIdentity,
    [AuthenticationEventType.GET_USER_IDENTITY]:
      IdentityService.getUserIdentity,
    [AuthenticationEventType.REVOKE_IDENTITY]: IdentityService.revokeIdentity,
    // SPORRAN
    [AuthenticationEventType.SPORRAN_GET_SESSION_VALUES]:
      SporranService.getSessionValues,
    [AuthenticationEventType.SPORRAN_SUBMIT_TERMS]: SporranService.submitTerms,
    [AuthenticationEventType.SPORRAN_SUBMIT_ATTESTATION]:
      SporranService.submitAttestation,
    [AuthenticationEventType.SPORRAN_REQUEST_CREDENTIAL]:
      SporranService.requestCredential,
    [AuthenticationEventType.SPORRAN_VERIFY_SESSION]:
      SporranService.verifySession,
    [AuthenticationEventType.SPORRAN_VERIFY_CREDENTIAL]:
      SporranService.verifyCredential,
    [AuthenticationEventType.GET_TOTAL_DIDS]:
      IdentityService.getTotalDidsCreated,
  };

  return await processors[event.eventName](event, context);
}
