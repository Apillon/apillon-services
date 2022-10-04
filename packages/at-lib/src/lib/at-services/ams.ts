import { env } from '../../config/env';
import { AmsEventType, JwtTokenType } from '../../config/types';
import { BaseService } from './base-service';
import { JwtUtils } from '../jwt-utils';
import { ConfigurationServicePlaceholders } from 'aws-sdk/lib/config_service_placeholders';

/**
 * Access Management Service client
 */
export class Ams extends BaseService {
  lambdaFunctionName = env.AT_AMS_FUNCTION_NAME;
  devPort = env.AT_AMS_SOCKET_PORT;
  serviceName = 'AMS';
  private securityToken: string;

  constructor() {
    super();
    this.isDefaultAsync = false;
    this.securityToken = this.generateSecurityToken();
  }

  public async getAuthUser(params: {
    user_uuid: string;
    project_uuid: string;
  }) {
    const data = {
      eventName: AmsEventType.USER_GET_AUTH,
      ...params,
      securityToken: this.securityToken,
    };

    // eslint-disable-next-line sonarjs/prefer-immediate-return
    const amsResponse = await this.callService(data);
    const token = new JwtUtils().generateToken(
      JwtTokenType.USER_AUTHENTICATION,
      amsResponse,
    );

    return {
      ...amsResponse,
      token: token,
    };
  }

  public async register(params: {
    user_uuid: string;
    email: string;
    password: string;
    project_uuid?: string;
    wallet?: string;
  }) {
    const data = {
      eventName: AmsEventType.USER_REGISTER,
      ...params,
      securityToken: this.securityToken,
    };

    // eslint-disable-next-line sonarjs/prefer-immediate-return
    const amsResponse = await this.callService(data);
    //TODO: do something with AMS response?

    return amsResponse;
  }

  public async login(params: { email: string; password: string }) {
    const data = {
      eventName: AmsEventType.USER_LOGIN,
      ...params,
      securityToken: this.securityToken,
    };

    // eslint-disable-next-line sonarjs/prefer-immediate-return
    const amsResponse = await this.callService(data);

    // Extract relevant data from amsResponse. This way we have full control
    // of required parameters and parameter names
    const result = {
      userId: amsResponse.data.id,
      status: amsResponse.data.status,
      user_uuid: amsResponse.data.user_uuid,
      email: amsResponse.data.email,
      wallet: amsResponse.wallet,
      authUserRoles: amsResponse.authUserRoles,
    };

    const token = new JwtUtils().generateToken(
      JwtTokenType.USER_AUTHENTICATION,
      result,
    );

    console.log('AUTH TOKEN ', token);

    return {
      ...result,
      token: token,
    };

    return amsResponse;
  }

  public async resetPassword(params: { user_uuid: string; password: string }) {
    const data = {
      eventName: AmsEventType.USER_PASSWORD_RESET,
      ...params,
      securityToken: this.securityToken,
    };

    // eslint-disable-next-line sonarjs/prefer-immediate-return
    const amsResponse = await this.callService(data);
    //TODO: do something with AMS response?

    return amsResponse;
  }

  public async updateAuthUser(params: {
    user_uuid: string;
    status?: number;
    email?: string;
    wallet?: string;
  }) {
    const data = {
      eventName: AmsEventType.USER_UPDATE,
      ...params,
      securityToken: this.securityToken,
    };

    // eslint-disable-next-line sonarjs/prefer-immediate-return
    const amsResponse = await this.callService(data);
    //TODO: do something with AMS response?

    return amsResponse;
  }

  private generateSecurityToken() {
    //TODO - generate JWT from APP secret
    return 'SecurityToken';
  }
}
