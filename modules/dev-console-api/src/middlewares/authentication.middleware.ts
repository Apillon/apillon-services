import { Injectable, NestMiddleware } from '@nestjs/common';
import { IRequest } from './context.middleware';

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
    const excluded = ['/', '/auth/login'];

    if (!excluded.includes(req.originalUrl)) {
      const { context } = req;
      const token = (req.get('authorization') || '').split(' ').reverse()[0];
      await context.authenticate(token);
    }

    next();
  }
}
