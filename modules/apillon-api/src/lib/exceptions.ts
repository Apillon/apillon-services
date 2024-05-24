import { Model } from '@rawmodel/core';
import {
  CodeException,
  ErrorOptions,
  ServiceName,
  ModelValidationException,
} from '@apillon/lib';
import { ApiErrorCode } from '../config/types';

export class ApiCodeException extends CodeException {
  constructor(options: ErrorOptions) {
    options = {
      sourceModule: ServiceName.APILLON_API,
      errorCodes: ApiErrorCode,
      errorMessage: options.errorMessage || ApiErrorCode[options.code],
      ...options,
    };
    super(options);
  }
}

export class AuthenticationValidationException extends ModelValidationException {
  constructor(model: Model) {
    super(model, ApiErrorCode);
  }
}
