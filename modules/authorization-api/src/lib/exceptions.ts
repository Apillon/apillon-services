import { Model } from '@rawmodel/core';
import {
  CodeException,
  ErrorOptions,
  ServiceName,
  ValidationException,
} from '@apillon/lib';
import { AuthorizationErrorCode } from '../config/types';

export class AuthorizationCodeException extends CodeException {
  constructor(options: ErrorOptions) {
    options = {
      sourceModule: ServiceName.STORAGE,
      errorCodes: AuthorizationErrorCode,
      errorMessage:
        options.errorMessage || AuthorizationErrorCode[options.code],
      ...options,
    };
    super(options);
  }
}

export class AuthroizationValidationException extends ValidationException {
  constructor(model: Model) {
    super(model, AuthorizationErrorCode);
  }
}
