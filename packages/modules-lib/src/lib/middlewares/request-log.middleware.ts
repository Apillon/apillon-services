import { Lmas } from '@apillon/lib';
import { RequestLogDto } from '@apillon/lib';
import { SerializeFor } from '@apillon/lib';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request } from 'express';

/**
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 */
@Injectable()
export class RequestLogMiddleware implements NestMiddleware {
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
          requestId: context?.requestId || '',
          host: req.hostname || '',
          ip:
            req.ip ||
            req.headers['X-Real-Ip'] ||
            req.headers['X-Forwarded-For'] ||
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
          body: JSON.stringify(bodyMap || []), // Don't log body because of its size.
          responseTime: Date.now() - startTime,
          createTime: new Date(),
          user_id: context?.user?.id || null,
        });
        await new Lmas().writeRequestLog(request);
      } catch (error) {
        console.log('error:', error);
      }
    };
    next();
  }
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
