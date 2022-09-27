/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpException, HttpStatus } from '@nestjs/common';
import { Model } from '@rawmodel/core';
import {
  BadRequestErrorCode,
  ErrorOrigin,
  LogType,
  SystemErrorCode,
} from '../config/types';
import { Context } from 'vm';
import { writeLog } from './logger';

export interface ErrorOptions {
  code: any;
  status: HttpStatus;
  context?: Context;
  errorMessage?: string;
  sourceFunction?: string;
  details?: any;
  errorCodes?: any;
}

export class CodeException extends HttpException {
  origin: ErrorOrigin;
  code: SystemErrorCode | BadRequestErrorCode | any;

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
        code: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: validationErrors,
        message: 'Validation error', // workaround for errors in production
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );

    this.modelName = model.constructor.name;
    this.errors = validationErrors;

    Error.captureStackTrace(this, this.constructor);
  }
}
