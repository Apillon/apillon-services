import { Model } from '@rawmodel/core';
import {
  CodeException,
  ErrorOptions,
  ServiceName,
  ValidationException,
} from '@apillon/lib';
import { AmsErrorCode } from '../config/types';

export class AmsCodeException extends CodeException {
  constructor(options: ErrorOptions) {
    options = {
      sourceModule: ServiceName.AMS,
      errorCodes: AmsErrorCode,
      ...options,
    };
    super(options);
  }
}

export class AmsValidationException extends ValidationException {
  constructor(model: Model) {
    super(model, AmsErrorCode);
  }
}
