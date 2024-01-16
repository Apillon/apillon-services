import { Model } from '@rawmodel/core';
import {
  CodeException,
  ErrorOptions,
  ServiceName,
  ValidationException,
} from '@apillon/lib';
import { SocialErrorCode } from '../config/types';

export class SocialCodeException extends CodeException {
  constructor(options: ErrorOptions) {
    super({
      sourceModule: ServiceName.SOCIAL,
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
