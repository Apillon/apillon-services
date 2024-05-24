import { Model } from '@rawmodel/core';
import {
  CodeException,
  Context,
  ErrorOptions,
  LogType,
  ServiceName,
  ModelValidationException,
} from '@apillon/lib';
import { AmsErrorCode } from '../config/types';
import { ServiceContext } from '@apillon/service-lib';

export class AmsCodeException extends CodeException {
  constructor(options: ErrorOptions) {
    options = {
      sourceModule: ServiceName.AMS,
      errorCodes: AmsErrorCode,
      errorMessage: options.errorMessage || AmsErrorCode[options.code],
      ...options,
    };
    super(options);
  }
}

export class AmsBadRequestException extends AmsCodeException {
  context: ServiceContext;
  event: any;
  constructor(context: ServiceContext, event: any) {
    super({ status: 400, code: AmsErrorCode.BAD_REQUEST });
    this.context = context;
    this.event = event;
  }

  override writeToMonitor(): Promise<this> {
    return super.writeToMonitor({
      context: this.context,
      user_uuid: this.event?.user_uuid,
      data: this.event,
    });
  }
}

export class AmsValidationException extends ModelValidationException {
  constructor(model: Model) {
    super(model, AmsErrorCode);
  }
}
