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
          throw new CodeException({
            status: HttpStatus.UNPROCESSABLE_ENTITY,
            code: AuthenticationErrorCode.IDENTITY_CAPTCHA_NOT_PRESENT,
            errorCodes: AuthenticationErrorCode,
          });
        }
        await verifyCaptcha(data.captcha?.token, env.CAPTCHA_SECRET).then(
          (response) => (captchaResult = response),
        );
      } else {
        throw new CodeException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          code: AuthenticationErrorCode.IDENTITY_CAPTCHA_NOT_CONFIGURED,
          errorCodes: AuthenticationErrorCode,
        });
      }

      console.log('CAPTCHA S', env.CAPTCHA_SECRET);
      console.log('CAPTCHA RESULT ', captchaResult);
      console.log('DATA RECEIVED ', data);

      if (
        env.CAPTCHA_SECRET &&
        env.APP_ENV !== AppEnvironment.TEST &&
        !captchaResult
      ) {
        throw new CodeException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          code: AuthenticationErrorCode.IDENTITY_CAPTCHA_INVALID,
          errorCodes: AuthenticationErrorCode,
        });
      }

      return true;
    } catch (error) {
      throw new CodeException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        code:
          error.name == 'CodeException'
            ? AuthenticationErrorCode.IDENTITY_CREATE_INVALID_REQUEST
            : error,
        errorCodes: AuthenticationErrorCode,
      });
    }
  }
}
