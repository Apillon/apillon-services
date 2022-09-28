import { HttpStatus, Injectable } from '@nestjs/common';
import { File } from './models/file.model';
import { DevConsoleApiContext } from '../../context';
import {
  AWS_S3,
  CodeException,
  env,
  SystemErrorCode,
  ValidationException,
} from 'at-lib';
import { ResourceNotFoundErrorCode } from '../../config/types';

@Injectable()
export class FileService {
  /**
   * Returns File by its ID. First search for it in DB, if found, make GET request to AWS bucket.
   */
  public async getFileById(
    context: DevConsoleApiContext,
    id: number,
  ): Promise<File> {
    const file = await new File({}, context).populateById(id);
    if (!file.exists()) {
      throw new CodeException({
        status: HttpStatus.NOT_FOUND,
        code: ResourceNotFoundErrorCode.FILE_DOES_NOT_EXISTS,
        sourceFunction: `${this.constructor.name}/getFileById`,
        context,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    const s3Client: AWS_S3 = new AWS_S3();

    if (!(await s3Client.exists(env.AWS_BUCKET, file.key))) {
      throw new CodeException({
        status: HttpStatus.NOT_FOUND,
        code: ResourceNotFoundErrorCode.FILE_DOES_NOT_EXISTS_IN_BUCKET,
        sourceFunction: `${this.constructor.name}/getFileById`,
        context,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    try {
      const f = await s3Client.get(env.AWS_BUCKET, file.key);
      file.body = f.Body.toString('base64');
    } catch (error) {
      throw new CodeException({
        code: SystemErrorCode.AWS_SYSTEM_ERROR,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        sourceFunction: `${this.constructor.name}/getFileById`,
        details: error,
        context,
        errorMessage: error.message,
      });
    }

    return file;
  }

  /**
   * Creates new file and uploads it to aws.
   *
   * @param file Already validated file data.
   * @param context Application context.
   * @returns File & upload URl.
   */
  public async createFile(
    context: DevConsoleApiContext,
    file: File,
  ): Promise<File> {
    //Method can be called from app, so extra validation is required
    try {
      await file.validate();
    } catch (error) {
      await file.handle(error);
    }
    if (!file.isValid()) {
      throw new ValidationException(file);
    }

    const s3Client: AWS_S3 = new AWS_S3();

    const conn = await context.mysql.start();

    try {
      await file.create(conn);
    } catch (error) {
      await context.mysql.rollback(conn);

      throw new CodeException({
        code: SystemErrorCode.SQL_SYSTEM_ERROR,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        sourceFunction: `${this.constructor.name}/createFile`,
        details: error,
        errorMessage: error.message,
      });
    }

    try {
      await s3Client.upload(
        env.AWS_BUCKET,
        file.key,
        Buffer.from(file.body, 'base64'),
        file.contentType,
      );
    } catch (error) {
      await context.mysql.rollback(conn);

      throw new CodeException({
        code: SystemErrorCode.AWS_SYSTEM_ERROR,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        sourceFunction: `${this.constructor.name}/createFile`,
        details: error,
        errorMessage: error.message,
      });
    }

    try {
      await context.mysql.commit(conn);
    } catch (error) {
      await context.mysql.rollback(conn);

      throw new CodeException({
        code: SystemErrorCode.SQL_SYSTEM_ERROR,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        sourceFunction: `${this.constructor.name}/createFile`,
        details: error,
        errorMessage: error.message,
      });
    }

    return file;
  }

  /**
   * Delete file from db and s3 bucket
   * @param fileId
   * @param context
   * @returns
   */
  public async deleteFileById(
    context: DevConsoleApiContext,
    id: number,
  ): Promise<void> {
    const file = await new File({}, context).populateById(id);
    if (!file.exists()) {
      throw new CodeException({
        status: HttpStatus.NOT_FOUND,
        code: ResourceNotFoundErrorCode.FILE_DOES_NOT_EXISTS,
        sourceFunction: `${this.constructor.name}/deleteFileById`,
        context,
      });
    }

    const s3Client: AWS_S3 = new AWS_S3();

    if (!(await s3Client.exists(env.AWS_BUCKET, file.key))) {
      throw new CodeException({
        status: HttpStatus.NOT_FOUND,
        code: ResourceNotFoundErrorCode.FILE_DOES_NOT_EXISTS_IN_BUCKET,
        sourceFunction: `${this.constructor.name}/deleteFileById`,
        context,
      });
    }

    try {
      await s3Client.remove(env.AWS_BUCKET, file.key);
    } catch (error) {
      throw new CodeException({
        code: SystemErrorCode.AWS_SYSTEM_ERROR,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        sourceFunction: `${this.constructor.name}/deleteFileById`,
        details: error,
        context,
        errorMessage: error.message,
      });
    }
  }
}
