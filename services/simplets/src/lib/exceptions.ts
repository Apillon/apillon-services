import { Model } from '@rawmodel/core';
import {
  CodeException,
  ErrorOptions,
  IValidationError,
  ModelValidationException,
  ServiceName,
  ValidationException,
} from '@apillon/lib';
import { SimpletsErrorCode } from '../config/types';

export class SimpletsCodeException extends CodeException {
  constructor(options: ErrorOptions) {
    super({
      sourceModule: ServiceName.SIMPLETS,
      errorCodes: SimpletsErrorCode,
      errorMessage: options.errorMessage || SimpletsErrorCode[options.code],
      ...options,
    });
  }
}

export class SimpletsModelValidationException extends ModelValidationException {
  constructor(model: Model) {
    super(model, SimpletsErrorCode);
  }
}

export class SimpletsValidationException extends ValidationException {
  constructor(errors: IValidationError | IValidationError[]) {
    super(errors, SimpletsErrorCode);
  }
}
