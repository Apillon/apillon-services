/* eslint-disable sonarjs/no-useless-catch */
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticationErrorCode } from '../config/types';
import { ValidationException } from '@apillon/lib';

import { IRequest } from '../middlewares/context.middleware';
import {
  IValidationOptions,
  VALIDATION_OPTIONS_KEY,
} from '@apillon/modules-lib';

@Injectable()
export class ValidationGuard implements CanActivate {
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

      dto = new options.dto({}, request.context).populate(
        data,
        options.populateFrom,
      );

      try {
        await dto.validate();
      } catch (error) {
        await dto.handle(error);
      }

      if (!dto.isValid()) {
        throw new ValidationException(dto, AuthenticationErrorCode);
      }

      request[options.validateFor] = dto;
      return true;
    } catch (error) {
      //TODO LOG-error
      throw error;
    }
  }
}
