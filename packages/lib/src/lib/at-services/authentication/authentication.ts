import { env } from '../../../config/env';
import { AppEnvironment, AuthenticationEventType } from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { IdentityCreateDto } from './dtos/identity-create.dto';
import { IdentityDidRevokeDto } from './dtos/identity-did-revoke.dto';
import { VerificationEmailDto } from './dtos/identity-verification-email.dto';
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
  serviceName = 'AUTHETICATION';

  constructor(context: Context) {
    super(context);
    this.isDefaultAsync = false;
  }

  //#REGION Verification
  public async verifyIdentity(params: VerificationIdentityDto) {
    const data = {
      eventName: AuthenticationEventType.IDENTITY_VERIFICATION,
      query: params.serialize(),
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
      eventName: AuthenticationEventType.GET_IDENTITY_USER_CREDENTIAL,
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

  public async sporranVerifySession(params: any) {
    const data = {
      eventName: AuthenticationEventType.SPORRAN_VERIFY_SESSION,
      body: params,
    };
    return await this.callService(data);
  }

  public async sporranSubmitTerms(params: any) {
    const data = {
      eventName: AuthenticationEventType.SPORRAN_SUBMIT_TERMS,
      body: params,
    };
    return await this.callService(data);
  }

  public async sporranSubmitAttestation(params: any) {
    const data = {
      eventName: AuthenticationEventType.SPORRAN_SUBMIT_ATTESTATION,
      body: params,
    };
    return await this.callService(data);
  }

  public async sporranRequestCredential(params: any) {
    const data = {
      eventName: AuthenticationEventType.SPORRAN_REQUEST_CREDENTIAL,
      body: params,
    };
    return await this.callService(data);
  }
  //#END
}
