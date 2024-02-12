import { CodeException, ErrorOptions, ServiceCode } from '@apillon/lib';
import { MailErrorCode } from '../config/types';

export class MailCodeException extends CodeException {
  constructor(options: ErrorOptions) {
    options = {
      sourceModule: ServiceCode.MAIL,
      errorCodes: MailErrorCode,
      errorMessage: options.errorMessage || MailErrorCode[options.code],
      ...options,
    };
    super(options);
  }
}
