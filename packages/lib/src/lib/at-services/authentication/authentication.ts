import { env } from '../../../config/env';
import { AppEnvironment, AuthenticationEventType } from '../../../config/types';
import { BaseProjectQueryFilter } from '../../base-models/base-project-query-filter.model';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { CreateEWIntegrationDto } from './dtos/create-embedded-wallet-integration.dto';
import { CreateOasisSignatureDto } from './dtos/create-oasis-signature.dto';
import { EmbeddedWalletSignaturesQueryFilter } from './dtos/embedded-wallet-signatures-query-filter.dto';
import { GenerateOtpDto } from './dtos/generate-otp.dto';
import { IdentityCreateDto } from './dtos/identity-create.dto';
import { IdentityDidRevokeDto } from './dtos/identity-did-revoke.dto';
import { VerificationEmailDto } from './dtos/identity-verification-email.dto';
import { RequestCredentialDto } from './dtos/sporran/message/request-credential.dto';
import { SubmitAttestationDto } from './dtos/sporran/message/submit-attestation.dto';
import { SubmitTermsDto } from './dtos/sporran/message/submit-terms.dto';
import { VerifyCredentialDto } from './dtos/sporran/message/verify-credential.dto';
import { SporranSessionVerifyDto } from './dtos/sporran/sporran-session.dto';
import { ValidateOtpDto } from './dtos/validate-otp.dto';
import { VerificationIdentityDto } from './dtos/verify-identity.dto';

export class AuthenticationMicroservice extends BaseService {
  lambdaFunctionName =
    env.APP_ENV === AppEnvironment.TEST
      ? env.AUTH_FUNCTION_NAME_TEST
      : env.AUTH_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.AUTH_SOCKET_PORT_TEST
      : env.AUTH_SOCKET_PORT;
  serviceName = 'AUTHENTICATION';

  constructor(context: Context) {
    super(context);
    this.isDefaultAsync = false;
  }

  //#region Verification
  public async verifyIdentity(params: VerificationIdentityDto) {
    const data = {
      eventName: AuthenticationEventType.IDENTITY_VERIFICATION,
      body: params.serialize(),
    };
    return await this.callService(data);
  }
  //#endregion

  //#region Identity Generation
  public async sendVerificationEmail(params: VerificationEmailDto) {
    const data = {
      eventName: AuthenticationEventType.SEND_VERIFICATION_EMAIL,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async getIdentityGenProcessState(email: string) {
    const data = {
      eventName: AuthenticationEventType.GET_IDENTITY_GEN_PROCESS_STATE,
      query: email,
    };
    return await this.callService(data);
  }

  public async generateIdentity(params: IdentityCreateDto) {
    const data = {
      eventName: AuthenticationEventType.GENERATE_IDENTITY,
      body: params,
    };
    return await this.callService(data);
  }

  public async getUserIdentityCredential(email: string) {
    const data = {
      eventName: AuthenticationEventType.GET_USER_IDENTITY,
      query: email,
    };
    return await this.callService(data);
  }

  public async revokeIdentity(params: IdentityDidRevokeDto) {
    const data = {
      eventName: AuthenticationEventType.REVOKE_IDENTITY,
      body: params,
    };
    return await this.callService(data);
  }
  //#endregion

  //#region Sporran Wallet
  public async getSessionValues() {
    const data = {
      eventName: AuthenticationEventType.SPORRAN_GET_SESSION_VALUES,
    };
    return await this.callService(data);
  }

  public async sporranVerifySession(params: SporranSessionVerifyDto) {
    const data = {
      eventName: AuthenticationEventType.SPORRAN_VERIFY_SESSION,
      body: params,
    };
    return await this.callService(data);
  }

  public async sporranSubmitTerms(params: SubmitTermsDto) {
    const data = {
      eventName: AuthenticationEventType.SPORRAN_SUBMIT_TERMS,
      body: params,
    };
    return await this.callService(data);
  }

  public async sporranSubmitAttestation(params: SubmitAttestationDto) {
    const data = {
      eventName: AuthenticationEventType.SPORRAN_SUBMIT_ATTESTATION,
      body: params,
    };
    return await this.callService(data);
  }

  public async sporranRequestCredential(params: RequestCredentialDto) {
    const data = {
      eventName: AuthenticationEventType.SPORRAN_REQUEST_CREDENTIAL,
      body: params,
    };
    return await this.callService(data);
  }

  public async sporranVerifyCredential(params: VerifyCredentialDto) {
    const data = {
      eventName: AuthenticationEventType.SPORRAN_VERIFY_CREDENTIAL,
      body: params,
    };
    return await this.callService(data);
  }
  //#endregion

  public async getTotalDidsCreated(project_uuid: string) {
    return await this.callService({
      eventName: AuthenticationEventType.GET_TOTAL_DIDS,
      project_uuid,
    });
  }

  //#region Embedded wallet

  public async getEmbeddedWalletInfo(project_uuid: string) {
    const data = {
      eventName: AuthenticationEventType.EW_INFO,
      project_uuid,
    };
    return await this.callService(data);
  }

  public async listEmbeddedWalletIntegrations(query: BaseProjectQueryFilter) {
    const data = {
      eventName: AuthenticationEventType.EW_INTEGRATION_LIST,
      query: query.serialize(),
    };
    return await this.callService(data);
  }

  public async getEmbeddedWalletIntegration(integration_uuid: string) {
    const data = {
      eventName: AuthenticationEventType.EW_INTEGRATION_GET,
      integration_uuid,
    };
    return await this.callService(data);
  }

  public async createEmbeddedWalletIntegration(body: CreateEWIntegrationDto) {
    const data = {
      eventName: AuthenticationEventType.EW_INTEGRATION_CREATE,
      body,
    };
    return await this.callService(data);
  }

  public async updateEmbeddedWalletIntegration(
    integration_uuid: string,
    body: any,
  ) {
    const data = {
      eventName: AuthenticationEventType.EW_INTEGRATION_UPDATE,
      integration_uuid,
      body,
    };
    return await this.callService(data);
  }

  public async createOasisSignature(params: CreateOasisSignatureDto) {
    const data = {
      eventName: AuthenticationEventType.CREATE_OASIS_SIGNATURE,
      body: params,
    };
    return await this.callService(data);
  }

  public async listEmbeddedWalletSignatures(
    query: EmbeddedWalletSignaturesQueryFilter,
  ) {
    return await this.callService({
      eventName: AuthenticationEventType.LIST_OASIS_SIGNATURES,
      query: query.serialize(),
    });
  }

  //#endregion

  //#region OTP
  public async generateOtp(params: GenerateOtpDto) {
    const data = {
      eventName: AuthenticationEventType.GENERATE_OTP,
      body: params,
    };
    return await this.callService(data);
  }

  public async validateOtp(params: ValidateOtpDto) {
    const data = {
      eventName: AuthenticationEventType.VALIDATE_OTP,
      body: params,
    };
    return await this.callService(data);
  }

  //#endregion
}
