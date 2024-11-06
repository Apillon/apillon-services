import {
  CodeException,
  ErrorOptions,
  ModelValidationException,
  ServiceName,
} from '@apillon/lib';
import { Model } from '@rawmodel/core';
import { InfrastructureErrorCode } from '../config/types';

export class InfrastructureCodeException extends CodeException {
  constructor(options: ErrorOptions) {
    super({
      sourceModule: ServiceName.INFRASTRUCTURE,
      errorCodes: InfrastructureErrorCode,
      errorMessage:
        options.errorMessage || InfrastructureErrorCode[options.code],
      ...options,
    });
  }
}

export class InfrastructureValidationException extends ModelValidationException {
  constructor(model: Model) {
    super(model, InfrastructureErrorCode);
  }
}
