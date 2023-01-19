import { IRequest } from '../middlewares/context.middleware';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  IValidationOptions,
  VALIDATION_OPTIONS_KEY,
} from '@apillon/modules-lib';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  public async canActivate(execCtx: ExecutionContext): Promise<boolean> {
    let dto;
    let options;
    try {
      options = this.reflector.getAllAndMerge(VALIDATION_OPTIONS_KEY, [
        execCtx.getHandler(),
        execCtx.getClass(),
      ]) as any as IValidationOptions;
      const request = execCtx.switchToHttp().getRequest<IRequest>();
      const data = request[options.validateFor];

      throw data;

      request[options.validateFor] = dto;
      return true;
    } catch (error) {
      //TODO LOG-error
      throw error;
    }

    return true;
  }
}
