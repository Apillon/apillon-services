import { Model } from '@rawmodel/core';
import {
  CodeException,
  ErrorOptions,
  ServiceName,
  ValidationException,
} from '@apillon/lib';
import { SocialErrorCode } from '../config/types';
import { ServiceContext } from '@apillon/service-lib';

export class SocialCodeException extends CodeException {
  constructor(options: ErrorOptions) {
    super({
      sourceModule: ServiceName.NFTS,
      errorCodes: SocialErrorCode,
      errorMessage: options.errorMessage || SocialErrorCode[options.code],
      ...options,
    });
  }
}

export class SocialValidationException extends ValidationException {
  constructor(model: Model) {
    super(model, SocialErrorCode);
  }
}
