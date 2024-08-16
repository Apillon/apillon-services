import { AuthenticationEventType, Context } from '@apillon/lib';
import { VerificationService } from './modules/verification/verification.service';
import { IdentityService } from './modules/identity/identity.service';
import { SporranService } from './modules/sporran/sporran.service';
import { OtpService } from './modules/otp/otp.service';
import { EmbeddedWalletService } from './modules/embedded-wallet/embedded-wallet.service';

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
    // GENERAL
    [AuthenticationEventType.GET_TOTAL_DIDS]:
      IdentityService.getTotalDidsCreated,
    // Embedded wallet
    [AuthenticationEventType.EW_INFO]:
      EmbeddedWalletService.getEmbeddedWalletInfo,
    [AuthenticationEventType.EW_INTEGRATION_CREATE]:
      EmbeddedWalletService.createEWIntegration,
    [AuthenticationEventType.EW_INTEGRATION_LIST]:
      EmbeddedWalletService.listEWIntegrations,
    [AuthenticationEventType.EW_INTEGRATION_GET]:
      EmbeddedWalletService.getEWIntegration,
    [AuthenticationEventType.EW_INTEGRATION_UPDATE]:
      EmbeddedWalletService.updateEWIntegration,
    [AuthenticationEventType.CREATE_OASIS_SIGNATURE]:
      EmbeddedWalletService.createOasisSignature,
    [AuthenticationEventType.LIST_OASIS_SIGNATURES]:
      EmbeddedWalletService.listOasisSignatures,
    // OTP
    [AuthenticationEventType.GENERATE_OTP]: OtpService.generateOtp,
    [AuthenticationEventType.VALIDATE_OTP]: OtpService.validateOtp,
  };

  return await processors[event.eventName](event, context);
}
