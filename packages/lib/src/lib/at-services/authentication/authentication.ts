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
      ? env.STORAGE_FUNCTION_NAME_TEST
      : env.STORAGE_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.STORAGE_SOCKET_PORT_TEST
      : env.STORAGE_SOCKET_PORT;
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
  //#ENDREGION

  //#REGION Identity Generation
  public async sendVerificationEmail(params: VerificationEmailDto) {
    const data = {
      eventName: AuthenticationEventType.SEND_VERIFICATION_EMAIL,
      query: params.serialize(),
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
      query: params,
    };
    return await this.callService(data);
  }

  public async getUserIdentityCredential(email: string) {
    const data = {
      eventName: AuthenticationEventType.GENERATE_IDENTITY,
      query: email,
    };
    return await this.callService(data);
  }

  public async revokeIdentity(params: IdentityDidRevokeDto) {
    const data = {
      eventName: AuthenticationEventType.REVOKE_IDENTITY,
      query: params,
    };
    return await this.callService(data);
  }

  public async generateDevResources(params: any) {
    const data = {
      eventName: AuthenticationEventType.GENERATE_DEV_RESOURCES,
      query: params,
    };
    return await this.callService(data);
  }
  //#ENDREGION

  //#region Sporran Wallet

  //#endregion
}
