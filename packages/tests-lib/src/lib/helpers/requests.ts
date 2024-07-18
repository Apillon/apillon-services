import { ApiKey } from '@apillon/access/src/modules/api-key/models/api-key.model';
import { HttpServer } from '@nestjs/common';
import * as request from 'supertest';

type UrlPath = `/${string}` | '/';

abstract class HttpServerClientBase {
  abstract getAuthorizationHeader(): string;

  private http: HttpServer;
  private readonly urlPrefix: string;

  protected constructor(http: HttpServer, urlPrefixPath: UrlPath = null) {
    this.http = http;
    this.urlPrefix = urlPrefixPath;
  }

  getFullUrl(urlPath: UrlPath) {
    const cleanPath = urlPath.replace(/^\//, '');
    if (!cleanPath) {
      return this.urlPrefix;
    }
    return this.urlPrefix ? `${this.urlPrefix}/${cleanPath}` : urlPath;
  }

  get(urlPath: UrlPath): request.Test {
    return request(this.http)
      .get(this.getFullUrl(urlPath))
      .set('Authorization', this.getAuthorizationHeader());
  }

  post(urlPath: UrlPath, body: { [key: string]: unknown }): request.Test {
    return request(this.http)
      .post(this.getFullUrl(urlPath))
      .send(body)
      .set('Authorization', this.getAuthorizationHeader());
  }

  delete(urlPath: UrlPath): request.Test {
    return request(this.http)
      .delete(this.getFullUrl(urlPath))
      .set('Authorization', this.getAuthorizationHeader());
  }
}

export class ApillonConsoleServerClient extends HttpServerClientBase {
  private readonly token: string;

  constructor(http: HttpServer, token: string, urlPrefix: UrlPath = null) {
    super(http, urlPrefix);
    this.token = token;
  }

  getAuthorizationHeader() {
    return `Bearer ${this.token}`;
  }
}

// TODO: for API tests
// export class ApillonApiServerClient extends HttpServerClientBase {
//   private readonly apiKey: string;
//   private readonly apiKeySecret: string;
//   constructor(
//     http: HttpServer,
//     apiKey: string,
//     apiKeySecret: string,
//     urlPrefix: UrlPath = null,
//   ) {
//     super(http, urlPrefix);
//     this.apiKey = apiKey;
//     this.apiKeySecret = apiKeySecret;
//   }
//   getAuthorizationToken() {
//     return Buffer.from(this.apiKey + ':' + this.apiKeySecret).toString(
//       'base64',
//     );
//   }
//   getAuthorizationHeader() {
//     return `Basic ${this.getAuthorizationToken()}`;
//   }
// }

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
