import { ApiKey } from '@apillon/access/src/modules/api-key/models/api-key.model';
import { HttpServer } from '@nestjs/common';
import * as request from 'supertest';

export function getRequestFactory(server: HttpServer, apiKey: ApiKey) {
  return async function (url: string, apiKeyOverride: ApiKey = undefined) {
    const apiKeyUsed = apiKeyOverride ? apiKeyOverride : apiKey;

    return request(server)
      .get(url)
      .set(
        'Authorization',
        `Basic ${Buffer.from(
          apiKeyUsed.apiKey + ':' + apiKeyUsed.apiKeySecret,
        ).toString('base64')}`,
      );
  };
}

export function postRequestFactory(server: HttpServer, apiKey: ApiKey) {
  return async function (
    url: string,
    data: any,
    apiKeyOverride: ApiKey = undefined,
  ) {
    const apiKeyUsed = apiKeyOverride ? apiKeyOverride : apiKey;

    return request(server)
      .post(url)
      .send(data)
      .set(
        'Authorization',
        `Basic ${Buffer.from(
          apiKeyUsed.apiKey + ':' + apiKeyUsed.apiKeySecret,
        ).toString('base64')}`,
      );
  };
}
