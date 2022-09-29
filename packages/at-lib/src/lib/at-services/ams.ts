import { env } from '../../config/env';
import { AmsEventType } from '../../config/types';
import { BaseService } from './base-service';

/**
 * Access Management Service client
 */
export class Ams extends BaseService {
  lambdaFunctionName = env.AT_AMS_FUNCTION_NAME;
  devPort = env.AT_AMS_SOCKET_PORT;
  serviceName = 'LMAS';

  constructor() {
    super();
    this.isDefaultAsync = false;
  }

  public async getAuthUser(
    params: {
      user_uuid: string;
      project_uuid: string;
    },
    securityToken: string,
  ) {
    const data = {
      eventName: AmsEventType.USER_GET_AUTH,
      ...params,
      securityToken,
    };

    // eslint-disable-next-line sonarjs/prefer-immediate-return
    const amsResponse = await this.callService(data);
    //TODO: do something with AMS response?

    return amsResponse;
  }

  public async register(
    params: {
      user_uuid: string;
      email: string;
      password: string;
      project_uuid?: string;
      wallet?: string;
    },
    securityToken: string,
  ) {
    const data = {
      eventName: AmsEventType.USER_REGISTER,
      ...params,
      securityToken,
    };

    // eslint-disable-next-line sonarjs/prefer-immediate-return
    const amsResponse = await this.callService(data);
    //TODO: do something with AMS response?

    return amsResponse;
  }

  public async login(
    params: {
      email: string;
      password: string;
    },
    securityToken: string,
  ) {
    const data = {
      eventName: AmsEventType.USER_LOGIN,
      ...params,
      securityToken,
    };

    // eslint-disable-next-line sonarjs/prefer-immediate-return
    const amsResponse = await this.callService(data);
    //TODO: do something with AMS response?

    return amsResponse;
  }

  public async resetPassword(
    params: {
      user_uuid: string;
      password: string;
    },
    securityToken: string,
  ) {
    const data = {
      eventName: AmsEventType.USER_PASSWORD_RESET,
      ...params,
      securityToken,
    };

    // eslint-disable-next-line sonarjs/prefer-immediate-return
    const amsResponse = await this.callService(data);
    //TODO: do something with AMS response?

    return amsResponse;
  }

  public async updateUser(
    params: {
      user_uuid: string;
      status?: number;
      email?: string;
      wallet?: string;
    },
    securityToken: string,
  ) {
    const data = {
      eventName: AmsEventType.USER_UPDATE,
      ...params,
      securityToken,
    };

    // eslint-disable-next-line sonarjs/prefer-immediate-return
    const amsResponse = await this.callService(data);
    //TODO: do something with AMS response?

    return amsResponse;
  }
}
