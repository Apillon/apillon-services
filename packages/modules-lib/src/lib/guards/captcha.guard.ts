import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { checkCaptcha } from '@apillon/lib';
import {
  IValidationOptions,
  VALIDATION_OPTIONS_KEY,
} from '../decorators/validation.decorator';
import { IRequest } from '../interfaces/i-request';

@Injectable()
export class CaptchaGuard implements CanActivate {
  constructor(@Inject(Reflector.name) private readonly reflector: Reflector) {}

  public async canActivate(execCtx: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndMerge(VALIDATION_OPTIONS_KEY, [
      execCtx.getHandler(),
      execCtx.getClass(),
    ]) as any as IValidationOptions;
    const request = execCtx.switchToHttp().getRequest<IRequest>();
    const { captcha } = request[options.validateFor] || {};

    return await checkCaptcha(captcha?.token);
  }
}
