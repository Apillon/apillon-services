import {
  env,
  Lmas,
  MongoCollections,
  RequestLogDto,
  ApiName,
} from '@apillon/lib';
import { Injectable, mixin, NestMiddleware, Type } from '@nestjs/common';

/**
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 */

export function createRequestLogMiddleware(
  apiName: ApiName,
): Type<NestMiddleware> {
  @Injectable()
  class RequestLogMiddleware implements NestMiddleware {
    async use(req: any, res: any, next: (error?: any) => void) {
      const { body } = req;
      const startTime = Date.now();
      const end = res.end;
      const context = req.context;
      const requestId = context?.requestId || '';
      let gatewayEvent = null as any;
      let apiKey = null;

      try {
        gatewayEvent = JSON.parse(
          decodeURI(req.headers['x-apigateway-event'] as string),
        );
      } catch (err) {}

      if (req.headers.authorization && apiName === ApiName.APILLON_API) {
        try {
          const base64Credentials = req.headers.authorization.split(' ')[1];
          const credentials = Buffer.from(base64Credentials, 'base64').toString(
            'ascii',
          );
          [apiKey] = credentials.split(':');
        } catch (err) {}
      }

      res.end = async function (...args) {
        try {
          console.log('RequestLogMiddleware');
          const argsArray = Array.prototype.slice.apply(args);
          end.apply(res, argsArray);
          const bodyMap = mapBody(body);
          const request = new RequestLogDto({}, context);
          request.populate({
            apiName: `${apiName} (${env.APP_ENV})`,
            requestId,
            host: req.hostname || null,
            ip:
              req.ip ||
              gatewayEvent?.requestContext?.identity?.sourceIp ||
              req.headers['x-forwarded-for']?.split(',')[0] ||
              null,
            country: req.headers['cloudfront-viewer-country'] || null,
            status: res.statusCode || 0,
            method: req.method || 'NONE',
            url: req.originalUrl || null,
            endpoint: req.originalUrl.split(/[?#]/)[0] || null,
            userAgent: req.headers?.['user-agent'] || null,
            origin: req.headers?.origin || null,
            referer: req.headers?.referer || null,
            body: JSON.stringify(bodyMap || []),
            responseTime: Date.now() - startTime,
            user_uuid:
              context?.user?.user_uuid ||
              context?.user?.id ||
              context?.user?.uuid ||
              null,
            apiKey,
            collectionName:
              apiName === ApiName.APILLON_API
                ? MongoCollections.API_REQUEST_LOGS
                : MongoCollections.REQUEST_LOGS,
          });
          await new Lmas().writeRequestLog(request);
          // console.log(`HEADERS: ${JSON.stringify(req.headers)}`);
        } catch (error) {
          console.error('Error writing request log:', error);
        }
      };
      next();
    }
  }
  return mixin(RequestLogMiddleware);
}

/**
 * Returns a mapped body object without password field included.
 * @param obj Multer files object from req.
 */
function mapBody(obj): unknown {
  const body = {};
  if (obj) {
    const excludes = ['password'];
    Object.keys(obj).forEach((key) => {
      if (excludes.indexOf(key) === -1) {
        body[key] = obj[key];
      }
    });
  }
  return body;
}
