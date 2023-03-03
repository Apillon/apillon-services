import { Model } from '@rawmodel/core';
import {
  CodeException,
  ErrorOptions,
  ServiceName,
  ValidationException,
} from '@apillon/lib';
import { NftsErrorCode } from '../config/types';

export class NftsCodeException extends CodeException {
  constructor(options: ErrorOptions) {
    options = {
      sourceModule: ServiceName.NFTS,
      errorCodes: NftsErrorCode,
      errorMessage: options.errorMessage || NftsErrorCode[options.code],
      ...options,
    };
    super(options);
  }
}

export class NftsValidationException extends ValidationException {
  constructor(model: Model) {
    super(model, NftsErrorCode);
  }
}
