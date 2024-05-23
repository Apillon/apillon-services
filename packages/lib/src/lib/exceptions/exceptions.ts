import { Model } from '@rawmodel/core';
import {
  BadRequestErrorCode,
  ErrorOrigin,
  LogType,
  SystemErrorCode,
  ValidatorErrorCode,
} from '../../config/types';
import { Lmas } from '../at-services/lmas/lmas';
import { Context } from '../context';
import { writeLog } from '../logger';
import { HttpException } from './http-exception';

export interface ErrorOptions {
  code: any;
  status: number;
  context?: any;
  errorMessage?: string;
  sourceFunction?: string;
  details?: any;
  errorCodes?: any;
  sourceModule?: string;
}

export class CodeException extends HttpException {
  origin: ErrorOrigin;
  statusCode: SystemErrorCode | BadRequestErrorCode | any;
  options: ErrorOptions;

  constructor(options: ErrorOptions) {
    super(
      {
        statusCode: options.code,
        message: options.errorCodes
          ? options.errorCodes[options.code]
          : options.errorMessage,
      },
      options.status,
    );
    this.options = options;

    writeLog(
      LogType.MSG,
      `(user: ${
        options.context && options.context.user
          ? `${options.context.user.id} ${options.context.user.email}`
          : 'NA'
      }) ${options.errorMessage || ''}, Details: ${
        options.details ? JSON.stringify(options.details) : 'NA'
      }`,
      options.code.toString(),
      options.sourceFunction || '',
      this,
    );
  }

  public async writeToMonitor(params?: {
    context?: Context;
    project_uuid?: string;
    user_uuid?: string;
    logType?: LogType;
    service?: string;
    data?: any;
    sendAdminAlert?: boolean;
  }) {
    await new Lmas().writeLog({
      context: params?.context || this.options.context,
      project_uuid: params?.project_uuid,
      user_uuid: params?.user_uuid || params?.context?.user?.user_uuid || null,
      logType: params?.logType || LogType.ERROR,
      message: this.options.errorCodes
        ? this.options.errorCodes[this.options.code]
        : this.options.errorMessage,
      location: this.options.sourceFunction,
      service: params?.service || this.options.sourceModule,
      data: params?.data || this.options.details,
      sendAdminAlert: params?.sendAdminAlert,
    });

    return this;
  }
}

export interface IValidationError {
  code: number;
  property: string;
  message?: string;
}

/**
 * Validation error.
 */
export class ValidationException extends HttpException {
  errors: IValidationError[];

  public constructor(
    errors: IValidationError | IValidationError[],
    errorCodes?: { [key: number]: string },
  ) {
    const errorsArray = Array.isArray(errors) ? errors : [errors];
    const errorsWithMessages = errorsArray.map((error) => ({
      ...error,
      message:
        errorCodes && !error.message
          ? { ...ValidatorErrorCode, ...errorCodes }[error.code]
          : error.message,
    }));
    super(
      {
        code: 422,
        errors: errorsWithMessages,
        message: 'Validation error', // workaround for errors in production
      },
      422,
    );

    this.errors = errorsWithMessages;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Model validation error.
 */
export class ModelValidationException extends ValidationException {
  modelName: string;

  /**
   * Class constructor.
   * @param model Model instance.
   * @param errorCodes Validator error codes from service, which initializes this class
   */
  public constructor(model: Model, errorCodes?: { [key: number]: string }) {
    const validationErrors = model.collectErrors().map(
      (x) =>
        ({
          code: x.code,
          property: x.path[0],
        }) as IValidationError,
    );

    super(validationErrors, errorCodes);

    this.modelName = model.constructor.name;
  }
}
