import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ValidationException } from '@apillon/lib';
import {
  IValidationOptions,
  VALIDATION_OPTIONS_KEY,
} from '@apillon/modules-lib';
import { IRequest } from '@apillon/modules-lib';
import { AuthenticationErrorCode } from '../config/types';

@Injectable()
export class ValidationGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  public async canActivate(execCtx: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndMerge(VALIDATION_OPTIONS_KEY, [
      execCtx.getHandler(),
      execCtx.getClass(),
    ]) as any as IValidationOptions;
    const request = execCtx.switchToHttp().getRequest<IRequest>();
    const data = request[options.validateFor];

    const dto = new (options.dto as any)({}, request.context).populate(
      data,
      options.populateFrom,
    );

    if (!options.skipValidation) {
      try {
        await dto.validate();
      } catch (error) {
        await dto.handle(error);
      }

      if (!dto.isValid()) {
        throw new ValidationException(dto, AuthenticationErrorCode);
      }
    }

    request[options.validateFor] = dto;
    return true;
  }
}
