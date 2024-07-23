import {
  CodeException,
  UnauthorizedErrorCodes,
  parseJwtToken,
} from '@apillon/lib';
import {
  VALIDATION_OPTIONS_KEY,
  IValidationOptions,
  IRequest,
} from '@apillon/modules-lib';
import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
  mixin,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const JwtGuard = (tokenType: string) => {
  @Injectable()
  class AuthGuardMixin implements CanActivate {
    constructor(@Inject(Reflector.name) public readonly reflector: Reflector) {}

    public async canActivate(execCtx: ExecutionContext): Promise<boolean> {
      const options = this.reflector.getAllAndMerge(VALIDATION_OPTIONS_KEY, [
        execCtx.getHandler(),
        execCtx.getClass(),
      ]) as any as IValidationOptions;
      const request = execCtx.switchToHttp().getRequest<IRequest>();
      const data = request[options.validateFor];

      try {
        const token = data.token;
        parseJwtToken(tokenType, token);
      } catch (error) {
        throw new CodeException({
          status: HttpStatus.BAD_REQUEST,
          code: UnauthorizedErrorCodes.INVALID_TOKEN,
          errorCodes: UnauthorizedErrorCodes,
        });
      }

      return true;
    }
  }

  return mixin(AuthGuardMixin);
};
