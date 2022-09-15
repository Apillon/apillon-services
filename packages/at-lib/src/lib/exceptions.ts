/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpException, HttpStatus } from '@nestjs/common';
import { Model } from '@rawmodel/core';
import { LogType } from '../config/types';
import { Context } from 'vm';
import { writeLog } from './logger';

export interface ErrorOptions {
  code: any;
  status: HttpStatus;
  context?: Context;
  errorMessage?: string;
  sourceFunction?: string;
  details?: any;
}

export class CodeException extends HttpException {
  constructor(options: ErrorOptions) {
    super(
      {
        code: options.code,
        message: options.errorMessage,
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
  /**
   * Class constructor.
   * @param model Model instance.
   */
  public constructor(model: Model) {
    // const validationErrorsStr = model.collectErrors();
    // .map((x) => {
    //   return JSON.stringify({
    //     code: x.code,
    //     message: messages[x.code],
    //     path: x.path,
    //   });
    // })
    // .join(', ');
    const validationErrors = model.collectErrors().map((x) => {
      return {
        code: x.code,
        path: x.path,
      };
    });

    super(
      {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: validationErrors,
        message: 'Validation error', // workaround for errors in production
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );

    Error.captureStackTrace(this, this.constructor);
  }
}
