import {
  CacheKeyPrefix,
  CacheKeyTTL,
  DwellirSubscription,
  LogType,
  env,
  runCachedFunction,
  writeLog,
} from '@apillon/lib';
import axios from 'axios';
import {
  DwellirChangeSubscriptionResponse,
  DwellirCreateApiKeyResponse,
  DwellirCreateUserResponse,
  DwellirGetAccessTokenResponse,
  DwellirGetAllUsagesResponse,
  DwellirGetApiKeyResponse,
  DwellirGetEndpointsResponse,
  DwellirGetUsageResponse,
  DwellirGetUsageV2Response,
} from './types';
import { InfrastructureCodeException } from '../exceptions';
import { InfrastructureErrorCode } from '../../config/types';

export class Dwellir {
  static async makeRequest<T>(
    url: string,
    method: 'get' | 'post' | 'delete',
    data?: any,
    errCallback?: (err: any) => void,
  ): Promise<T> {
    const accessToken = await this.getAccessToken();
    try {
      const response = await axios({
        url,
        method,
        params: method === 'get' ? data : undefined,
        data,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (err) {
      if (errCallback) {
        errCallback(err);
      } else {
        console.log('err', err);
        writeLog(
          LogType.ERROR,
          `Error making request to ${url} : ${JSON.stringify(err.response?.data || err)}`,
          'services/infrastructure/src/lib/dwellir.ts',
          method,
        );
        throw err;
      }
    }
  }

  static async getAccessToken() {
    return runCachedFunction(
      CacheKeyPrefix.DWELLIR_ACCESS_TOKEN,
      async function () {
        try {
          const response = await axios.post<DwellirGetAccessTokenResponse>(
            `${env.DWELLIR_URL}/v1/login`,
            {
              username: env.DWELLIR_USERNAME,
              password: env.DWELLIR_PASSWORD,
            },
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            },
          );

          return response.data.access_token;
        } catch (err) {
          writeLog(
            LogType.ERROR,
            `Error getting Dwellir access token: ${JSON.stringify(err.response?.data || err)}`,
            'services/infrastructure/src/lib/dwellir.ts',
            'getAccessToken',
          );
          throw err;
        }
      },
      CacheKeyTTL.THREE_HOURS,
    );
  }

  static async createUser(email: string) {
    return this.makeRequest<DwellirCreateUserResponse>(
      `${env.DWELLIR_URL}/v1/user`,
      'post',
      { email, name: email },
      (err) => {
        if (err.response?.status === 400) {
          throw new InfrastructureCodeException({
            code: InfrastructureErrorCode.DWELLIR_EMAIL_ALREADY_EXISTS,
            status: 400,
          });
        }
        writeLog(
          LogType.ERROR,
          `Error when creating Dwellir user: ${JSON.stringify(err.response?.data || err)}`,
          'services/infrastructure/src/lib/dwellir.ts',
          'createUser',
        );

        throw err;
      },
    );
  }

  static async createApiKey(userId: string) {
    return this.makeRequest<DwellirCreateApiKeyResponse>(
      `${env.DWELLIR_URL}/v1/user/${userId}/api_key`,
      'post',
    );
  }

  static async getInitialApiKey(userId: string) {
    const apiKeys = await this.makeRequest<DwellirGetApiKeyResponse[]>(
      `${env.DWELLIR_URL}/v1/user/${userId}/api_key`,
      'get',
    );

    const apiKey = apiKeys[0];

    if (!apiKey) {
      throw new Error('Initial API Key missing!');
    }

    return apiKey;
  }

  static async revokeApiKey(userId: string, apiKeyId: string) {
    return this.makeRequest<void>(
      `${env.DWELLIR_URL}/v1/user/${userId}/api_key/${apiKeyId}`,
      'delete',
    );
  }

  static async getEndpoints() {
    return this.makeRequest<DwellirGetEndpointsResponse>(
      `${env.DWELLIR_URL}/v1/endpoint`,
      'get',
    );
  }

  static async getUsage(userId: string) {
    return this.makeRequest<DwellirGetUsageResponse>(
      `${env.DWELLIR_URL}/v1/user/${userId}/analytics/day`,
      'get',
      {
        start_of_month: true,
      },
    );
  }

  // Includes usage per chain
  static async getUsageV2(userId: string) {
    return this.makeRequest<DwellirGetUsageV2Response>(
      `${env.DWELLIR_URL}/v2/user/${userId}/analytics/day?start_of_month=true`,
      'post',
    );
  }

  static async getAllUsagesPerUser() {
    return this.makeRequest<DwellirGetAllUsagesResponse>(
      `${env.DWELLIR_URL}/v1/analytics`,
      'get',
    );
  }

  static async changeSubscription(
    userId: string,
    subscription: DwellirSubscription,
  ) {
    return this.makeRequest<DwellirChangeSubscriptionResponse>(
      `${env.DWELLIR_URL}/v1/user/${userId}/subscription/change_subscription/${subscription}`,
      'post',
    );
  }
}
