import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModelValidationException } from '@apillon/lib';
import {
  IValidationOptions,
  VALIDATION_OPTIONS_KEY,
} from '@apillon/modules-lib';
import { IRequest } from '@apillon/modules-lib';
import { ValidatorErrorCode } from '../config/types';

@Injectable()
export class ValidationGuard implements CanActivate {
  constructor(@Inject(Reflector.name) private readonly reflector: Reflector) {}

  public async canActivate(execCtx: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndMerge(VALIDATION_OPTIONS_KEY, [
      execCtx.getHandler(),
      execCtx.getClass(),
    ]) as any as IValidationOptions;
    const request = execCtx.switchToHttp().getRequest<IRequest>();
    const data = request[options.validateFor];
    data.project_uuid = request.context.apiKey.project_uuid;

    const dto = new (options.dto as any)({}, request.context).populate(
      data,
      options.populateFrom,
    );

    if (!options.skipValidation) {
      await dto.validateOrThrow(ModelValidationException, ValidatorErrorCode);
    }

    request[options.validateFor] = dto;
    return true;
  }
}
