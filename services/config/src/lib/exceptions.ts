import { Model } from '@rawmodel/core';
import {
  CodeException,
  ErrorOptions,
  ServiceCode,
  ValidationException,
} from '@apillon/lib';
import { ConfigErrorCode } from '../config/types';

export class ScsCodeException extends CodeException {
  constructor(options: ErrorOptions) {
    options = {
      sourceModule: ServiceCode.CONFIG,
      errorCodes: ConfigErrorCode,
      errorMessage: options.errorMessage || ConfigErrorCode[options.code],
      ...options,
    };
    super(options);
  }
}

export class ScsValidationException extends ValidationException {
  constructor(model: Model) {
    super(model, ConfigErrorCode);
  }
}

export class ScsNotFoundException extends ScsCodeException {
  constructor(code: ConfigErrorCode) {
    super({ code, status: 404 });
  }
}
