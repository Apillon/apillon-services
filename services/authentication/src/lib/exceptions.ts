import { Model } from '@rawmodel/core';
import {
  CodeException,
  ErrorOptions,
  ServiceName,
  ModelValidationException,
} from '@apillon/lib';
import { AuthenticationErrorCode } from '../config/types';

export class AuthenticationCodeException extends CodeException {
  constructor(options: ErrorOptions) {
    options = {
      sourceModule: ServiceName.AUTHENTICATION_API,
      errorCodes: AuthenticationErrorCode,
      errorMessage:
        options.errorMessage || AuthenticationErrorCode[options.code],
      ...options,
    };
    super(options);
  }
}

export class AuthenticationValidationException extends ModelValidationException {
  constructor(model: Model) {
    super(model, AuthenticationErrorCode);
  }
}
