import { env } from '@apillon/lib';
import { pickBy } from 'lodash';
import axios, { Method } from 'axios';
import { InfrastructureCodeException } from '../../../lib/exceptions';
import { InfrastructureErrorCode } from '../../../config/types';

export async function sqdApi<T = any>({
  version = 'v1',
  method,
  path,
  data,
  query = {},
  headers = {},
  responseType = 'json',
}: {
  version?: 'v1';
  method: Method;
  path: string;
  query?: Record<string, string | string[] | boolean | number | undefined>;
  data?: unknown;
  headers?: Record<string, string>;
  responseType?: 'json' | 'stream';
}): Promise<{ body: T }> {
  if (!env.SQD_API_URL || !env.SQD_API_TOKEN || !env.SQD_ORGANIZATION_CODE) {
    throw new InfrastructureCodeException({
      code: InfrastructureErrorCode.SQD_API_NOT_CONFIGURED,
      status: 500,
    });
  }

  // add the API_URL to the path if it's not a full url
  const url = !path.startsWith('http')
    ? `${env.SQD_API_URL}/${version}/${path}`
    : path;

  const finalHeaders = {
    authorization: `token ${env.SQD_API_TOKEN}`,
    'X-CLI-Version': version,
    ...headers,
  };

  let response;
  try {
    response = await axios(url, {
      method,
      headers: finalHeaders,
      data,
      timeout: responseType === 'stream' ? 0 : undefined,
      responseType,
      params: pickBy(query, (v) => v),
      validateStatus: () => true,
    });
  } catch (e) {
    throw new InfrastructureCodeException({
      code: InfrastructureErrorCode.ERROR_CALLING_SQD_API,
      status: 500,
      details: {
        method: method.toUpperCase(),
        url,
        error: e.message,
      },
    });
  }

  switch (response.status) {
    case 200:
    case 201:
    case 204: {
      if (response.data?.error) {
        throw new InfrastructureCodeException({
          errorMessage: response.data.error,
          code: InfrastructureErrorCode.ERROR_CALLING_SQD_API,
          status: 500,
          details: {
            method: method.toUpperCase(),
            url: response.config.url || 'Unknown URL',
            status: response.status,
            responseData: response.data,
          },
        });
      }
      return { body: response.data.payload };
    }
    default:
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.ERROR_CALLING_SQD_API,
        status: 500,
        details: {
          method: method.toUpperCase(),
          url: response.config.url || 'Unknown URL',
          status: response.status,
          responseData: response.data,
        },
      });
  }
}
