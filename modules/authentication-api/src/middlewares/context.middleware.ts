import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request } from 'express';
import { AuthenticationApiContext } from '../context';

export interface IRequest extends Request {
  context: AuthenticationApiContext;
  query: { [key: string]: undefined | string };
}

/**
 * Returns a middleware which creates a context.
 */
@Injectable()
export class ContextMiddleware implements NestMiddleware {
  use(req: IRequest, res, next) {
    let requestId = null;
    try {
      requestId = JSON.parse(
        decodeURI(req.headers['x-apigateway-context'] as string),
      )?.awsRequestId;
    } catch (err) {}

    req.context = new AuthenticationApiContext(requestId);

    next();
  }
}
