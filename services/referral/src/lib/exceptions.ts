import { Model } from '@rawmodel/core';
import {
  CodeException,
  ErrorOptions,
  ServiceName,
  ValidationException,
} from '@apillon/lib';
import { ReferralErrorCode } from '../config/types';

export class ReferralCodeException extends CodeException {
  constructor(options: ErrorOptions) {
    options = {
      sourceModule: ServiceName.REFERRAL,
      errorCodes: ReferralErrorCode,
      errorMessage: options.errorMessage || ReferralErrorCode[options.code],
      ...options,
    };
    super(options);
  }
}

export class ReferralValidationException extends ValidationException {
  constructor(model: Model) {
    super(model, ReferralErrorCode);
  }
}
