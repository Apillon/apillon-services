import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { SystemErrorCode, CodeException, ValidationException } from 'at-lib';
import { Request, Response } from 'express';

@Catch()
export class ExceptionsFilter implements ExceptionFilter {
  catch(error: any, host: ArgumentsHost) {
    const exceptionCtx = host.switchToHttp();
    const res = exceptionCtx.getResponse<Response>();
    const request = exceptionCtx.getRequest<Request>();

    if (error instanceof CodeException) {
      res.status(error.getStatus()).json({
        status: error.getStatus(),
        code: error.getResponse()['code'],
        message: error.message,
        origin: error.origin,
        path: request.url,
        timestamp: new Date().toISOString(),
      });
    } else if (error instanceof ValidationException) {
      res.status(error.getStatus()).json({
        status: error.getStatus(),
        model: error.modelName,
        errors: error.errors,
        path: request.url,
        timestamp: new Date().toISOString(),
      });
    } else {
      if (error.status == 422) {
        //Validation errors recieved from microservice - handled in at-lib base-service
        res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
          code: error.code || SystemErrorCode.MICROSERVICE_SYSTEM_ERROR,
          message: error.message,
          errors: error.errors,
          path: request.url,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          code: error.code || SystemErrorCode.UNHANDLED_SYSTEM_ERROR,
          message: error.message,
          path: request.url,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }
}
