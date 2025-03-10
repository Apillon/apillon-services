import { Model } from '@rawmodel/core';
import {
  CodeException,
  ErrorOptions,
  IValidationError,
  ModelValidationException,
  ServiceName,
  ValidationException,
} from '@apillon/lib';
import { HostingErrorCode } from '../config/types';

export class HostingCodeException extends CodeException {
  constructor(options: ErrorOptions) {
    super({
      sourceModule: ServiceName.HOSTING,
      errorCodes: HostingErrorCode,
      errorMessage: options.errorMessage || HostingErrorCode[options.code],
      ...options,
    });
  }
}

export class HostingModelValidationException extends ModelValidationException {
  constructor(model: Model) {
    super(model, HostingErrorCode);
  }
}

export class HostingValidationException extends ValidationException {
  constructor(errors: IValidationError | IValidationError[]) {
    super(errors, HostingErrorCode);
  }
}
