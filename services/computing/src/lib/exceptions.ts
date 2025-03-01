import { Model } from '@rawmodel/core';
import {
  CodeException,
  ErrorOptions,
  ServiceName,
  ModelValidationException,
  ValidationException,
} from '@apillon/lib';
import { ComputingErrorCode } from '../config/types';
import { IValidationError } from '@apillon/lib';

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

export class ComputingModelValidationException extends ModelValidationException {
  constructor(model: Model) {
    super(model, ComputingErrorCode);
  }
}

export class ComputingValidationException extends ValidationException {
  constructor(errors: IValidationError | IValidationError[]) {
    super(errors, ComputingErrorCode);
  }
}

export class ComputingNotFoundException extends ComputingCodeException {
  constructor(
    code: ComputingErrorCode = ComputingErrorCode.CONTRACT_NOT_FOUND,
  ) {
    super({ code, status: 404 });
  }
}
