import {
  BadRequestErrorCode,
  CodeException,
  UnauthorizedErrorCodes,
} from '@apillon/lib';
import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';

const AUTHORIZATION_HEADER = 'Authorization';

/**
 * Authenticates user or returns error if that is not possible.
 * This middleware should be applied before any authorization middleware.
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 */
@Injectable()
export class AuthenticateApiKeyMiddleware implements NestMiddleware {
  async use(req, res, next) {
    const { context } = req;

    // check for basic auth header
    if (
      !req.headers.authorization ||
      req.headers.authorization.indexOf('Basic ') === -1
    ) {
      throw new CodeException({
        code: BadRequestErrorCode.MISSING_AUTHORIZATION_HEADER,
        status: HttpStatus.BAD_REQUEST,
        errorMessage: 'Missing Authorization header',
      });
    }

    // Parse basic credentials
    const base64Credentials = req.headers.authorization.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString(
      'ascii',
    );
    const [apiKey, apiKeySecret] = credentials.split(':');

    if (apiKey && apiKeySecret)
      await context.authenticate(apiKey, apiKeySecret);

    next();
  }
}
