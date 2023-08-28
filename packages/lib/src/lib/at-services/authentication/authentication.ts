import { env } from '../../../config/env';
import { AppEnvironment, AuthenticationEventType } from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { IdentityCreateDto } from './dtos/identity-create.dto';
import { IdentityDidRevokeDto } from './dtos/identity-did-revoke.dto';
import { VerificationEmailDto } from './dtos/identity-verification-email.dto';
import { RequestCredentialDto } from './dtos/sporran/message/request-credential.dto';
import { SubmitAttestationDto } from './dtos/sporran/message/submit-attestation.dto';
import { SubmitTermsDto } from './dtos/sporran/message/submit-terms.dto';
import { VerifyCredentialDto } from './dtos/sporran/message/verify-credential.dto';
import { SporranSessionVerifyDto } from './dtos/sporran/sporran-session.dto';
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

  //#REGION Verification
  public async verifyIdentity(params: VerificationIdentityDto) {
    const data = {
      eventName: AuthenticationEventType.IDENTITY_VERIFICATION,
      body: params.serialize(),
    };
    return await this.callService(data);
  }
  //#END

  //#REGION Identity Generation
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

  public async generateDevResources(params: any) {
    const data = {
      eventName: AuthenticationEventType.GENERATE_DEV_RESOURCES,
      body: params,
    };
    return await this.callService(data);
  }
  //#END

  //#REGION Sporran Wallet
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
  //#END
}
