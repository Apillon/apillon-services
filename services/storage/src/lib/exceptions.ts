import { Model } from '@rawmodel/core';
import {
  CodeException,
  ErrorOptions,
  ServiceName,
  ValidationException,
} from 'at-lib';
import { StorageErrorCode } from '../config/types';

export class StorageCodeException extends CodeException {
  constructor(options: ErrorOptions) {
    options = {
      sourceModule: ServiceName.AMS,
      errorCodes: StorageErrorCode,
      ...options,
    };
    super(options);
  }
}

export class StorageValidationException extends ValidationException {
  constructor(model: Model) {
    super(model, StorageErrorCode);
  }
}
