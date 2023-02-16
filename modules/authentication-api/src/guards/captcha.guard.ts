import { AppEnvironment, CodeException, env } from '@apillon/lib';
import {
  VALIDATION_OPTIONS_KEY,
  IValidationOptions,
  IRequest,
  verifyCaptcha,
} from '@apillon/modules-lib';
import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticationErrorCode } from '../config/types';

@Injectable()
export class CaptchaGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  public async canActivate(execCtx: ExecutionContext): Promise<boolean> {
    let error;
    try {
      const options = this.reflector.getAllAndMerge(VALIDATION_OPTIONS_KEY, [
        execCtx.getHandler(),
        execCtx.getClass(),
      ]) as any as IValidationOptions;
      const request = execCtx.switchToHttp().getRequest<IRequest>();
      const data = request[options.validateFor];
      let captchaResult;

      if (env.CAPTCHA_SECRET && env.APP_ENV !== AppEnvironment.TEST) {
        if (!data.captcha) {
          error = AuthenticationErrorCode.IDENTITY_CAPTCHA_NOT_PRESENT;
        }
        await verifyCaptcha(data.captcha?.token, env.CAPTCHA_SECRET).then(
          (response) => (captchaResult = response),
        );
      } else {
        error = AuthenticationErrorCode.IDENTITY_CAPTCHA_NOT_CONFIGURED;
      }

      if (
        env.CAPTCHA_SECRET &&
        env.APP_ENV !== AppEnvironment.TEST &&
        !captchaResult
      ) {
        error = AuthenticationErrorCode.IDENTITY_CAPTCHA_INVALID;
      }

      return true;
    } catch (error) {
      error = error;
    }

    if (error) {
      throw new CodeException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code: error.prototype.isPrototypeOf(AuthenticationErrorCode)
          ? error
          : AuthenticationErrorCode.IDENTITY_CREATE_INVALID_REQUEST,
        errorCodes: AuthenticationErrorCode,
      });
    }
  }
}
