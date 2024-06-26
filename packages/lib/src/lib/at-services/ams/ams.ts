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
import { ApiKeyRoleDto } from './dtos/api-key-role.dto';
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
    evmWallet?: string;
  }) {
    const data = {
      eventName: AmsEventType.USER_REGISTER,
      ...params,
    };

    return await this.callService(data);
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

  public async logout(params: { user_uuid?: string }) {
    const data = {
      eventName: AmsEventType.USER_LOGOUT,
      ...params,
    };
    return await this.callService(data);
  }

  public async resetPassword(params: { token: string; password: string }) {
    const data = {
      eventName: AmsEventType.USER_PASSWORD_RESET,
      ...params,
    };

    return await this.callService(data);
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

    return await this.callService(data);
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

  public async loginWithWallet(authData: UserWalletAuthDto) {
    const data = {
      eventName: AmsEventType.USER_WALLET_LOGIN,
      authData,
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

  public async getProjectOwner(project_uuid: string) {
    const data = {
      eventName: AmsEventType.GET_PROJECT_OWNER,
      project_uuid,
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

  public async assignRoleToApiKey(body: ApiKeyRoleDto) {
    const data = {
      eventName: AmsEventType.API_KEY_ROLE_ASSIGN,
      body: body.serialize(),
    };
    return await this.callService(data);
  }

  public async removeApiKeyRole(body: ApiKeyRoleDto) {
    const data = {
      eventName: AmsEventType.API_KEY_ROLE_REMOVE,
      body: body.serialize(),
    };
    return await this.callService(data);
  }

  public async removeApiKeyRolesByService(body: ApiKeyRoleDto) {
    const data = {
      eventName: AmsEventType.API_KEY_ROLES_REMOVE_BY_SERVICE,
      body: body.serialize(),
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

  //#region discord

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

  //#endregion

  //#region Admin panel functions
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

  public async updateAuthUserStatus(params: {
    user_uuid: string;
    status?: number;
  }) {
    const data = {
      eventName: AmsEventType.USER_SET_STATUS,
      ...params,
    };
    return await this.callService(data);
  }

  public async updateApiKeysInProject(params: {
    project_uuids: string[];
    block: boolean;
  }) {
    const data = {
      eventName: AmsEventType.API_KEYS_IN_PROJECT_UPDATE,
      ...params,
    };
    return await this.callService(data);
  }

  //#endregion
}
