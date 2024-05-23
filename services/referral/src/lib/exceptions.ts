import { Model } from '@rawmodel/core';
import {
  CodeException,
  ErrorOptions,
  ServiceName,
  ModelValidationException,
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

export class ReferralValidationException extends ModelValidationException {
  constructor(model: Model) {
    super(model, ReferralErrorCode);
  }
}
