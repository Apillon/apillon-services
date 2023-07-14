import { env } from '../../../config/env';
import {
  AmsEventType,
  AppEnvironment,
  DefaultUserRole,
  OauthLinkType,
} from '../../../config/types';
import { BaseQueryFilter } from '../../base-models/base-query-filter.model';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { ApiKeyQueryFilterDto } from './dtos/api-key-query-filter.dto';
import { ApiKeyRoleBaseDto } from './dtos/api-key-role-base.dto';
import { CreateApiKeyDto } from './dtos/create-api-key.dto';
import { CreateOauthLinkDto } from './dtos/create-oauth-link.dto';
import { OauthListFilterDto } from './dtos/discord-user-list-filter.dto';
import { UserWalletAuthDto } from './dtos/user-wallet-auth.dto';

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

  constructor(context: Context) {
    super(context);
    this.isDefaultAsync = false;
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

  public async loginWithKilt(params: { token: string }) {
    const data = {
      eventName: AmsEventType.USER_LOGIN_KILT,
      ...params,
    };

    // eslint-disable-next-line sonarjs/prefer-immediate-return
    const amsResponse = await this.callService(data);

    return {
      ...amsResponse,
    };
  }

  public async resetPassword(params: { token: string; password: string }) {
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
    consents?: { terms: Array<any> };
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

  public async emailExists(
    email: string,
  ): Promise<{ data: { result: boolean; authUser: any } }> {
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

  public async loginWithWallet(authData: UserWalletAuthDto, message: string) {
    const data = {
      eventName: AmsEventType.USER_WALLET_LOGIN,
      authData,
      message,
    };

    // eslint-disable-next-line sonarjs/prefer-immediate-return
    const amsResponse = await this.callService(data);

    return {
      ...amsResponse,
    };
  }

  public async assignUserRole(params: {
    user?: any;
    user_uuid: string;
    project_uuid?: string;
    role_id: DefaultUserRole;
  }) {
    const data = {
      ...params,
      eventName: AmsEventType.USER_ROLE_ASSIGN,
      user: params.user?.serialize(),
    };

    return await this.callService(data);
  }

  public async removeUserRole(params: {
    user?: any;
    user_uuid: string;
    project_uuid?: string;
    role_id: DefaultUserRole;
  }) {
    const data = {
      ...params,
      eventName: AmsEventType.USER_ROLE_REMOVE,
      user: params.user?.serialize(),
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

  public async listApiKeys(params: ApiKeyQueryFilterDto) {
    const data = {
      eventName: AmsEventType.LIST_API_KEYS,
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  public async createApiKey(params: CreateApiKeyDto) {
    const data = {
      eventName: AmsEventType.CREATE_API_KEY,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async deleteApiKey(params: { id: number }) {
    const data = {
      eventName: AmsEventType.DELETE_API_KEY,
      ...params,
    };
    return await this.callService(data);
  }

  public async assignRoleToApiKey(apiKey_id: number, body: ApiKeyRoleBaseDto) {
    const data = {
      eventName: AmsEventType.API_KEY_ROLE_ASSIGN,
      body: body.serialize(),
      apiKey_id,
    };
    return await this.callService(data);
  }

  public async removeApiKeyRole(apiKey_id: number, body: ApiKeyRoleBaseDto) {
    const data = {
      eventName: AmsEventType.API_KEY_ROLE_REMOVE,
      body: body.serialize(),
      apiKey_id,
    };
    return await this.callService(data);
  }

  public async getApiKeyRoles(params: { apiKey_id: number }) {
    const data = {
      eventName: AmsEventType.GET_API_KEY_ROLES,
      ...params,
    };
    return await this.callService(data);
  }

  //#endregion

  public async linkDiscord(params: CreateOauthLinkDto) {
    const data = {
      eventName: AmsEventType.DISCORD_LINK,
      ...params,
    };
    return await this.callService(data);
  }

  public async unlinkDiscord() {
    const data = {
      eventName: AmsEventType.DISCORD_UNLINK,
    };
    return await this.callService(data);
  }

  public async getDiscordUserList(params: OauthListFilterDto) {
    const data = {
      eventName: AmsEventType.DISCORD_USER_LIST,
      ...params,
      type: OauthLinkType.DISCORD,
    };
    return await this.callService(data);
  }

  public async getOauthLinks(user_uuid: string) {
    const data = {
      eventName: AmsEventType.GET_OAUTH_LINKS,
      user_uuid,
    };
    return await this.callService(data);
  }

  public async getUserLogins(user_uuid: string, query: BaseQueryFilter) {
    const data = {
      eventName: AmsEventType.USER_GET_LOGINS,
      user_uuid,
      query,
    };
    return await this.callService(data);
  }

  public async getUserRoles(user_uuid: string, query: BaseQueryFilter) {
    const data = {
      eventName: AmsEventType.USER_GET_ROLES,
      user_uuid,
      query,
    };
    return await this.callService(data);
  }
}
