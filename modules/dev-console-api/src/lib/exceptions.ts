import { HttpException, HttpStatus } from '@nestjs/common';
import { Model } from '@rawmodel/core';
import { ErrorCode, LogType } from '../config/types';
import { Context } from 'vm';
import messages from '../config/messages';
// import { writeLog } from './logger';

export interface ErrorOptions {
  code: ErrorCode;
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
        message: options.errorMessage || messages[options.code] || ErrorCode[options.code],
      },
      options.status,
    );

    // writeLog(
    //   LogType.MESSAGE,
    //   `(user: ${
    //     options.context && options.context.user ? `${options.context.user.id} ${options.context.user.email}` : 'NA'
    //   }) ${options.errorMessage || ''}, Details: ${options.details ? JSON.stringify(options.details) : 'NA'}`,
    //   options.code.toString(),
    //   options.sourceFunction || '',
    //   this,
    // );
  }
}
