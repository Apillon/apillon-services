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
import { ServiceContext } from '@apillon/service-lib';

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

export class ContractsNotFoundException extends ContractsCodeException {
  constructor(
    code: ContractsErrorCode = ContractsErrorCode.CONTRACT_DOES_NOT_EXIST,
  ) {
    super({ code, status: 404 });
  }
}
