import { ApiName } from '@apillon/lib';
import { Injectable, NestMiddleware, Type, mixin } from '@nestjs/common';

const AUTHORIZATION_HEADER = 'Authorization';

/**
 * Authenticates user or returns error if that is not possible.
 * This middleware should be applied before any authorization middleware.
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 */
export function createAuthenticateUserMiddleware(
  apiName: ApiName,
): Type<NestMiddleware> {
  @Injectable()
  class AuthenticateUserMiddleware implements NestMiddleware {
    async use(req, res, next) {
      const { context } = req;
      const token = (req.get(AUTHORIZATION_HEADER) || '')
        .split(' ')
        .reverse()[0];
      if (token) {
        await context.authenticate(token);
      }
      context.apiName = apiName;
      next();
    }
  }
  return mixin(AuthenticateUserMiddleware);
}
