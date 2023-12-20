import { Model } from '@rawmodel/core';
import {
  CodeException,
  ErrorOptions,
  ServiceName,
  ValidationException,
} from '@apillon/lib';
import { SubsocialErrorCode } from '../config/types';
import { ServiceContext } from '@apillon/service-lib';

export class SubsocialCodeException extends CodeException {
  constructor(options: ErrorOptions) {
    super({
      sourceModule: ServiceName.NFTS,
      errorCodes: SubsocialErrorCode,
      errorMessage: options.errorMessage || SubsocialErrorCode[options.code],
      ...options,
    });
  }
}

export class SubsocialValidationException extends ValidationException {
  constructor(model: Model) {
    super(model, SubsocialErrorCode);
  }
}
