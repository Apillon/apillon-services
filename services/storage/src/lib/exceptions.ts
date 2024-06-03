import { Model } from '@rawmodel/core';
import {
  CodeException,
  ErrorOptions,
  ServiceName,
  ModelValidationException,
} from '@apillon/lib';
import { StorageErrorCode } from '../config/types';

export class StorageCodeException extends CodeException {
  constructor(options: ErrorOptions) {
    options = {
      sourceModule: ServiceName.STORAGE,
      errorCodes: StorageErrorCode,
      errorMessage: options.errorMessage || StorageErrorCode[options.code],
      ...options,
    };
    super(options);
  }
}

export class StorageValidationException extends ModelValidationException {
  constructor(model: Model) {
    super(model, StorageErrorCode);
  }
}

export class StorageNotFoundException extends StorageCodeException {
  constructor(code: StorageErrorCode = StorageErrorCode.BUCKET_NOT_FOUND) {
    super({ code, status: 404 });
  }
}
