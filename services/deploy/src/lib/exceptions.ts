import { Model } from '@rawmodel/core';
import {
  CodeException,
  ErrorOptions,
  IValidationError,
  ModelValidationException,
  ServiceName,
  ValidationException,
} from '@apillon/lib';
import { DeployErrorCode } from '../config/types';

export class DeployCodeException extends CodeException {
  constructor(options: ErrorOptions) {
    super({
      sourceModule: ServiceName.DEPLOY,
      errorCodes: DeployErrorCode,
      errorMessage: options.errorMessage || DeployErrorCode[options.code],
      ...options,
    });
  }
}

export class DeployModelValidationException extends ModelValidationException {
  constructor(model: Model) {
    super(model, DeployErrorCode);
  }
}

export class DeployValidationException extends ValidationException {
  constructor(errors: IValidationError | IValidationError[]) {
    super(errors, DeployErrorCode);
  }
}
