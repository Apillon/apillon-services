import { Injectable, NestMiddleware } from '@nestjs/common';
import { IRequest } from './context.middleware';

const AUTHORIZATION_HEADER = 'Authorization';

/**
 * Authenticates user or returns error if that is not possible.
 * This middleware should be applied before any authorization middleware.
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 */
@Injectable()
export class AuthenticateUserMiddleware implements NestMiddleware {
  async use(req: IRequest, res, next) {
    const excluded = ['/', '/auth/login', '/user/register'];

    if (!excluded.includes(req.originalUrl)) {
      const { context } = req;
      const token = (req.get(AUTHORIZATION_HEADER) || '')
        .split(' ')
        .reverse()[0];
      await context.authenticate(token);
    }

    next();
  }
}
