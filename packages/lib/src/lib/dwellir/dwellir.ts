import axios from 'axios';
import { runCachedFunction } from '../cache';
import { CacheKeyPrefix, CacheKeyTTL, LogType } from '../../config/types';
import { env } from '../../config/env';
import { writeLog } from '../logger';

const dwellirAPIUrl = 'https://marly.dwellir.com:9999/partner';

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
      writeLog(
        LogType.ERROR,
        `Error making request to ${url} : ${JSON.stringify(err.response?.data || err)}`,
        'packages/lib/dwellir/dwellir.ts',
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
          const response = await axios.post<{
            access_token: string;
            token_type: string;
          }>(
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
            'packages/lib/dwellir/dwellir.ts',
            'getAccessToken',
          );
          throw err;
        }
      },
      CacheKeyTTL.THREE_HOURS,
    );
  }

  static async createUser(email: string) {
    return this.makeRequest<{ id: string; email: string; name: string }>(
      `${dwellirAPIUrl}/v1/user`,
      'post',
      { email, name: email },
    );
  }

  static async createApiKey(userId: string) {
    return this.makeRequest<{ id: number; api_key: string }>(
      `${dwellirAPIUrl}/v1/user/${userId}/api_key`,
      'post',
    );
  }

  static async getInitialApiKey(userId: string) {
    const apiKeys = await this.makeRequest<{ id: number; api_key: string }[]>(
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
    return this.makeRequest<
      {
        id: number;
        name: string;
        networks: {
          id: number;
          name: string;
          nodes: {
            id: number;
            https: string;
            wss: string;
            node_type: string;
            type: string;
            version: string;
          }[];
          type: string;
          version: string;
        }[];
      }[]
    >(`${dwellirAPIUrl}/v1/endpoint`, 'get');
  }

  static async getUsage(userId: string) {
    return this.makeRequest<{
      total_requests: number;
      total_response: number;
      by_key: Record<
        string,
        Record<
          string,
          {
            responses: number;
            requests: number;
            by_method: Record<string, { requests: number; responses: number }>;
          }
        >
      >;
    }>(`${dwellirAPIUrl}/v1/user/${userId}/analytics/day`, 'get');
  }
}
