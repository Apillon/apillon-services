import {
  AppEnvironment,
  CodeException,
  ValidatorErrorCode,
  env,
  getEnvSecrets,
} from '@apillon/lib';
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

@Injectable()
export class CaptchaGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  public async canActivate(execCtx: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndMerge(VALIDATION_OPTIONS_KEY, [
      execCtx.getHandler(),
      execCtx.getClass(),
    ]) as any as IValidationOptions;
    const request = execCtx.switchToHttp().getRequest<IRequest>();
    const { captcha } = request[options.validateFor] || {};

    await getEnvSecrets();
    const allowedEnvs = [
      AppEnvironment.LOCAL_DEV,
      AppEnvironment.TEST,
    ] as string[];
    if (!env.CAPTCHA_SECRET && !allowedEnvs.includes(env.APP_ENV)) {
      this.throwCodeException(
        ValidatorErrorCode.IDENTITY_CAPTCHA_NOT_CONFIGURED,
      );
    }

    if (!captcha) {
      this.throwCodeException(ValidatorErrorCode.IDENTITY_CAPTCHA_NOT_PRESENT);
    }

    if (!(await verifyCaptcha(captcha?.token))) {
      // this.throwCodeException(ValidatorErrorCode.IDENTITY_CAPTCHA_INVALID);
    }

    return true;
  }

  throwCodeException = (code: ValidatorErrorCode) => {
    throw new CodeException({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      code,
      errorCodes: ValidatorErrorCode,
    });
  };
}
