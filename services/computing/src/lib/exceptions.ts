import { Model } from '@rawmodel/core';
import {
  CodeException,
  ErrorOptions,
  ServiceName,
  ValidationException,
} from '@apillon/lib';
import { ComputingErrorCode } from '../config/types';

export class ComputingCodeException extends CodeException {
  constructor(options: ErrorOptions) {
    options = {
      sourceModule: ServiceName.COMPUTING,
      errorCodes: ComputingErrorCode,
      errorMessage: options.errorMessage || ComputingErrorCode[options.code],
      ...options,
    };
    super(options);
  }
}

export class ComputingValidationException extends ValidationException {
  constructor(model: Model) {
    super(model, ComputingErrorCode);
  }
}
