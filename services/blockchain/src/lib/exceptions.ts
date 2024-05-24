import { Model } from '@rawmodel/core';
import {
  CodeException,
  ErrorOptions,
  ServiceName,
  ModelValidationException,
} from '@apillon/lib';
import { BlockchainErrorCode } from '../config/types';

export class BlockchainCodeException extends CodeException {
  constructor(options: ErrorOptions) {
    options = {
      sourceModule: ServiceName.AMS,
      errorCodes: BlockchainErrorCode,
      errorMessage: options.errorMessage || BlockchainErrorCode[options.code],
      ...options,
    };
    super(options);
  }
}

export class BlockchainValidationException extends ModelValidationException {
  constructor(model: Model) {
    super(model, BlockchainErrorCode);
  }
}
