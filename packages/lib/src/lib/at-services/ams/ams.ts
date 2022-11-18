import { env } from '../../../config/env';
import {
  AmsEventType,
  AppEnvironment,
  DefaultUserRole,
} from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { ApiKeyQueryFilter } from './dtos/api-key-query-filter.dto';
import { ApiKeyRoleBaseDto } from './dtos/api-key-role-base.dto';
import { CreateApiKeyDto } from './dtos/create-api-key.dto';

/**
 * Access Management Service client
 */
export class Ams extends BaseService {
  lambdaFunctionName =
    env.APP_ENV === AppEnvironment.TEST
      ? env.ACCESS_FUNCTION_NAME_TEST
      : env.ACCESS_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.ACCESS_SOCKET_PORT_TEST
      : env.ACCESS_SOCKET_PORT;
  serviceName = 'AMS';

  user: any;

  constructor(context?: Context) {
    super();
    this.isDefaultAsync = false;
    if (context) {
      this.user = context.user;
    }
  }

  public async getAuthUser(params: { token: string }) {
    const data = {
      eventName: AmsEventType.USER_GET_AUTH,
      ...params,
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
    };

    // eslint-disable-next-line sonarjs/prefer-immediate-return
    const amsResponse = await this.callService(data);

    return {
      ...amsResponse,
    };
  }

  public async resetPassword(params: { email: string; password: string }) {
    const data = {
      eventName: AmsEventType.USER_PASSWORD_RESET,
      ...params,
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
    };

    // eslint-disable-next-line sonarjs/prefer-immediate-return
    const amsResponse = await this.callService(data);

    return {
      ...amsResponse,
    };
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
    };

    return await this.callService(data);
  }

  //#region API-key functions

  public async getApiKey(params: { apiKey: string; apiKeySecret: string }) {
    const data = {
      eventName: AmsEventType.GET_API_KEY,
      ...params,
      securityToken: this.securityToken,
    };

    return await this.callService(data);
  }

  public async listApiKeys(params: ApiKeyQueryFilter) {
    const data = {
      eventName: AmsEventType.LIST_API_KEYS,
      user: this.user.serialize(),
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  public async createApiKey(params: CreateApiKeyDto) {
    const data = {
      eventName: AmsEventType.CREATE_API_KEY,
      user: this.user.serialize(),
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async deleteApiKey(params: { id: number }) {
    const data = {
      eventName: AmsEventType.DELETE_API_KEY,
      user: this.user.serialize(),
      ...params,
    };
    return await this.callService(data);
  }

  public async assignRoleToApiKey(apiKey_id: number, body: ApiKeyRoleBaseDto) {
    const data = {
      eventName: AmsEventType.API_KEY_ROLE_ASSIGN,
      user: this.user.serialize(),
      body: body.serialize(),
      apiKey_id,
    };
    return await this.callService(data);
  }

  public async removeApiKeyRole(apiKey_id: number, body: ApiKeyRoleBaseDto) {
    const data = {
      eventName: AmsEventType.API_KEY_ROLE_REMOVE,
      user: this.user.serialize(),
      body: body.serialize(),
      apiKey_id,
    };
    return await this.callService(data);
  }

  public async getApiKeyRoles(params: { apiKey_id: number }) {
    const data = {
      eventName: AmsEventType.GET_API_KEY_ROLES,
      user: this.user.serialize(),
      ...params,
    };
    return await this.callService(data);
  }

  //#endregion
}
