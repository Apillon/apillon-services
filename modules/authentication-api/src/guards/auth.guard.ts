import { CodeException, parseJwtToken } from '@apillon/lib';
import {
  VALIDATION_OPTIONS_KEY,
  IValidationOptions,
  IRequest,
} from '@apillon/modules-lib';
import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
  mixin,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticationErrorCode } from '../config/types';

export const AuthGuard = (tokenType: string) => {
  @Injectable()
  class AuthGuardMixin implements CanActivate {
    constructor(public reflector: Reflector) {}

    public async canActivate(execCtx: ExecutionContext): Promise<boolean> {
      const options = this.reflector.getAllAndMerge(VALIDATION_OPTIONS_KEY, [
        execCtx.getHandler(),
        execCtx.getClass(),
      ]) as any as IValidationOptions;
      const request = execCtx.switchToHttp().getRequest<IRequest>();
      const data = request[options.validateFor];

      let tokenData: any;
      try {
        const token = extractTokenFromHeader(request);
        tokenData = parseJwtToken(tokenType, token);
        if (options.validateFor) {
          request[options.validateFor].token = token;
        }
      } catch (error) {
        throw new CodeException({
          status: HttpStatus.UNAUTHORIZED,
          code: AuthenticationErrorCode.IDENTITY_INVALID_VERIFICATION_TOKEN,
          errorCodes: AuthenticationErrorCode,
        });
      }

      if (tokenData.email && tokenData.email !== data?.email) {
        throw new CodeException({
          status: HttpStatus.BAD_REQUEST,
          code: AuthenticationErrorCode.IDENTITY_INVALID_TOKEN_DATA,
          errorCodes: AuthenticationErrorCode,
        });
      }

      return true;
    }
  }

  function extractTokenFromHeader(request: IRequest): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  return mixin(AuthGuardMixin);
};
