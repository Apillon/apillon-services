import { Model } from '@rawmodel/core';
import {
  CodeException,
  ErrorOptions,
  IValidationError,
  ModelValidationException,
  ServiceName,
  ValidationException,
} from '@apillon/lib';
import { AssetManagementErrorCode } from '../config/types';

export class AssetManagementCodeException extends CodeException {
  constructor(options: ErrorOptions) {
    super({
      sourceModule: ServiceName.ASSET_MANAGEMENT,
      errorCodes: AssetManagementErrorCode,
      errorMessage:
        options.errorMessage || AssetManagementErrorCode[options.code],
      ...options,
    });
  }
}

export class AssetManagementModelValidationException extends ModelValidationException {
  constructor(model: Model) {
    super(model, AssetManagementErrorCode);
  }
}

export class AssetManagementValidationException extends ValidationException {
  constructor(errors: IValidationError | IValidationError[]) {
    super(errors, AssetManagementErrorCode);
  }
}
