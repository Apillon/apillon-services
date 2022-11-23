import { Lmas } from '@apillon/lib';
import { RequestLogDto } from '@apillon/lib';
import { Injectable, mixin, NestMiddleware, Type } from '@nestjs/common';

/**
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 */

export function createRequestLogMiddleware(
  apiName: string,
): Type<NestMiddleware> {
  @Injectable()
  class RequestLogMiddleware implements NestMiddleware {
    async use(req: any, res: any, next: (error?: any) => void) {
      const { body } = req;
      const startTime = Date.now();
      const end = res.end;
      const context = req.context;
      res.end = async function (...args) {
        try {
          const argsArray = Array.prototype.slice.apply(args);
          end.apply(res, argsArray);
          const bodyMap = mapBody(body);
          const request = new RequestLogDto({}, context);
          request.populate({
            apiName,
            requestId: context?.requestId || '',
            host: req.hostname || '',
            ip:
              req.ip ||
              req.sourceIp ||
              req.headers['X-Real-Ip'] ||
              req.headers['X-Forwarded-For'] ||
              req.http?.sourceIp ||
              req.identity?.sourceIp ||
              null,
            status: res.statusCode || 0,
            method: req.method || 'NONE',
            url: req.originalUrl || '',
            endpoint: req.originalUrl.split(/[?#]/)[0] || '',
            userAgent:
              req.headers && req.headers['user-agent']
                ? req.headers['user-agent']
                : '',
            origin:
              req.headers && req.headers['origin'] ? req.headers['origin'] : '',
            body: JSON.stringify(bodyMap || []),
            responseTime: Date.now() - startTime,
            createTime: new Date(),
            user_id:
              context?.user?.user_uuid ||
              context?.user?.id ||
              context?.user?.uuid ||
              null,
          });
          await new Lmas().writeRequestLog(request);
        } catch (error) {
          console.log('error:', error);
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
