import { Model } from '@rawmodel/core';
import {
  BadRequestErrorCode,
  ErrorOrigin,
  LogType,
  SystemErrorCode,
} from '../../config/types';
import { Lmas } from '../at-services/lmas';
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
  code: SystemErrorCode | BadRequestErrorCode | any;
  options: ErrorOptions;

  constructor(options: ErrorOptions) {
    super(
      {
        code: options.code,
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

  public async writeToMonitor(params: {
    projectId?: string;
    userId?: string;
    logType?: LogType;
  }) {
    await new Lmas().writeLog({
      projectId: params.projectId,
      userId: params.userId,
      logType: params.logType || LogType.ERROR,
      message: this.options.errorCodes
        ? this.options.errorCodes[this.options.code]
        : this.options.errorMessage,
      location: this.options.sourceFunction,
    });

    return this;
  }
}

/**
 * Model validation error.
 */
export class ValidationException extends HttpException {
  modelName: string;
  errors: any[];

  /**
   * Class constructor.
   * @param model Model instance.
   * @param ValidatorErrorCode Validator error codes from service, which initializes this class
   */
  public constructor(model: Model, ValidatorErrorCode?: any) {
    const validationErrors = model.collectErrors().map((x) => {
      return {
        code: x.code,
        property: x.path[0],
        message: ValidatorErrorCode ? ValidatorErrorCode[x.code] : '',
      };
    });

    super(
      {
        code: 422,
        errors: validationErrors,
        message: 'Validation error', // workaround for errors in production
      },
      422,
    );

    this.modelName = model.constructor.name;
    this.errors = validationErrors;

    Error.captureStackTrace(this, this.constructor);
  }
}
