import {
  CacheKeyPrefix,
  CacheKeyTTL,
  LogType,
  env,
  runCachedFunction,
  writeLog,
} from '@apillon/lib';
import axios from 'axios';
import {
  DwellirCreateApiKeyResponse,
  DwellirCreateUserResponse,
  DwellirGetAccessTokenResponse,
  DwellirGetApiKeyResponse,
  DwellirGetEndpointsResponse,
  DwellirGetUsageResponse,
} from './types';

const dwellirAPIUrl = env.DWELLIR_URL;

export class Dwellir {
  static async makeRequest<T>(
    url: string,
    method: 'get' | 'post' | 'delete',
    data?: any,
  ): Promise<T> {
    const accessToken = await this.getAccessToken();
    try {
      const response = await axios({
        url,
        method,
        data,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (err) {
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

  static async getAccessToken() {
    return runCachedFunction(
      CacheKeyPrefix.DWELLIR_ACCESS_TOKEN,
      async function () {
        try {
          const response = await axios.post<DwellirGetAccessTokenResponse>(
            `${dwellirAPIUrl}/v1/login`,
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
      `${dwellirAPIUrl}/v1/user`,
      'post',
      { email, name: email },
    );
  }

  static async createApiKey(userId: string) {
    return this.makeRequest<DwellirCreateApiKeyResponse>(
      `${dwellirAPIUrl}/v1/user/${userId}/api_key`,
      'post',
    );
  }

  static async getInitialApiKey(userId: string) {
    const apiKeys = await this.makeRequest<DwellirGetApiKeyResponse[]>(
      `${dwellirAPIUrl}/v1/user/${userId}/api_key`,
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
      `${dwellirAPIUrl}/v1/user/${userId}/api_key/${apiKeyId}`,
      'delete',
    );
  }

  static async getEndpoints() {
    return this.makeRequest<DwellirGetEndpointsResponse>(
      `${dwellirAPIUrl}/v1/endpoint`,
      'get',
    );
  }

  static async getUsage(userId: string) {
    return this.makeRequest<DwellirGetUsageResponse>(
      `${dwellirAPIUrl}/v1/user/${userId}/analytics/day`,
      'get',
    );
  }
}
