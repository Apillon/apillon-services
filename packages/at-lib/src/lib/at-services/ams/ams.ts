import { env } from '../../../config/env';
import {
  AmsEventType,
  AppEnvironment,
  DefaultUserRole,
} from '../../../config/types';
import { BaseService } from '../base-service';

/**
 * Access Management Service client
 */
export class Ams extends BaseService {
  lambdaFunctionName =
    env.APP_ENV === AppEnvironment.TEST
      ? env.AT_AMS_FUNCTION_NAME_TEST
      : env.AT_AMS_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.AT_AMS_SOCKET_PORT_TEST
      : env.AT_AMS_SOCKET_PORT;
  serviceName = 'AMS';
  private securityToken: string;

  constructor() {
    super();
    this.isDefaultAsync = false;
    this.securityToken = this.generateSecurityToken();
  }

  public async getAuthUser(params: { token: string }) {
    const data = {
      eventName: AmsEventType.USER_GET_AUTH,
      ...params,
      securityToken: this.securityToken,
    };

    // eslint-disable-next-line sonarjs/prefer-immediate-return
    const amsResponse = await this.callService(data);

    return {
      ...amsResponse,
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

    return {
      ...amsResponse,
    };
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

  public async emailExists(email: string) {
    const data = {
      eventName: AmsEventType.USER_EMAIL_EXISTS,
      email,
      securityToken: this.securityToken,
    };

    // eslint-disable-next-line sonarjs/prefer-immediate-return
    const amsResponse = await this.callService(data);

    return {
      ...amsResponse,
    };
  }

  public async getAuthUserByEmail(email: string) {
    const data = {
      eventName: AmsEventType.GET_AUTH_USER_BY_EMAIL,
      email,
      securityToken: this.securityToken,
    };

    // eslint-disable-next-line sonarjs/prefer-immediate-return
    const amsResponse = await this.callService(data);

    return {
      ...amsResponse,
    };
  }

  private generateSecurityToken() {
    // NOTE - Rename as not to be confused with JwtUtils().generateToken
    // NOTE2 - This should probably be a util function somewhere outside this file?
    //TODO - generate JWT from APP secret
    return 'SecurityToken';
  }

  public async assignUserRoleOnProject(params: {
    user: any;
    user_uuid: string;
    project_uuid: string;
    role_id: DefaultUserRole;
  }) {
    const data = {
      ...params,
      eventName: AmsEventType.USER_ROLE_ASSIGN,
      user: params.user ? params.user.serialize() : undefined,
      securityToken: this.securityToken,
    };

    return await this.callService(data);
  }

  public async removeUserRoleOnProject(params: {
    user: any;
    user_uuid: string;
    project_uuid: string;
    role_id: DefaultUserRole;
  }) {
    const data = {
      ...params,
      eventName: AmsEventType.USER_ROLE_REMOVE,
      user: params.user.serialize(),
      securityToken: this.securityToken,
    };

    return await this.callService(data);
  }

  USER_ROLE_REMOVE;
}
