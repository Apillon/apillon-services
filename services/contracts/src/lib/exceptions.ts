import { Model } from '@rawmodel/core';
import {
  CodeException,
  ErrorOptions,
  ServiceName,
  ModelValidationException,
  IValidationError,
  ValidationException,
} from '@apillon/lib';
import { ContractsErrorCode } from '../config/types';

export class ContractsCodeException extends CodeException {
  constructor(options: ErrorOptions) {
    super({
      sourceModule: ServiceName.CONTRACTS,
      errorCodes: ContractsErrorCode,
      errorMessage: options.errorMessage || ContractsErrorCode[options.code],
      ...options,
    });
  }
}

export class ContractsModelValidationException extends ModelValidationException {
  constructor(model: Model) {
    super(model, ContractsErrorCode);
  }
}

export class ContractsValidationException extends ValidationException {
  constructor(errors: IValidationError | IValidationError[]) {
    super(errors, ContractsErrorCode);
  }
}
