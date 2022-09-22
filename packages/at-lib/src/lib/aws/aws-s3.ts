/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable sonarjs/no-identical-functions */
import * as aws from 'aws-sdk';
import { HeadObjectOutput } from 'aws-sdk/clients/s3';
import { env } from '../../config/env';
import { AppEnvironment } from '../../config/types';

export class AWS_S3 {
  private s3Client: aws.S3;

  constructor() {
    try {
      if (env.APP_ENV == AppEnvironment.LOCAL_DEV) {
        this.s3Client = new aws.S3({
          accessKeyId: env.AWS_KEY,
          secretAccessKey: env.AWS_SECRET,
          region: env.AWS_REGION,
          endpoint: env.AWS_ENDPOINT,
          s3ForcePathStyle: true,
        });
      } else {
        this.s3Client = new aws.S3({
          accessKeyId: env.AWS_KEY,
          secretAccessKey: env.AWS_SECRET,
          region: env.AWS_REGION,
        });
      }
    } catch (err) {
      console.error(
        'error creating AWS S3 client',
        {
          params: {
            key: env.AWS_KEY,
            secret: env.AWS_SECRET,
            reg: env.AWS_REGION,
            endpoint: env.AWS_ENDPOINT,
            env: env.APP_ENV,
          },
        },
        err,
      );
      throw err;
    }
  }

  /**
   * Checks if file exists in S3 bucket
   * @param bucket
   * @param source
   * @returns
   */
  exists(bucket: string, source: string) {
    return new Promise((resolve, reject) => {
      this.s3Client.headObject(
        {
          Bucket: bucket,
          Key: source,
        },
        (err, data) => {
          if (err) {
            console.error(err);
            resolve(false);
          } else {
            resolve(true);
          }
        },
      );
    });
  }

  /**
   * Creates S3 file.
   * @param source File source path.
   * @param body File to be uploaded.
   * @param ctx Request context.
   */
  upload(bucket: string, source: string, body: Blob | Buffer | ReadableStream, contentType: string) {
    return new Promise((resolve, reject) => {
      this.s3Client.upload(
        {
          Bucket: bucket,
          Key: source,
          Body: body,
          ContentType: contentType,
        },
        (err, data) => {
          if (err) {
            console.error(err);
            reject(err);
          } else {
            resolve(data);
          }
        },
      );
    });
  }

  /**
   * Retrieves S3 file.
   * @param source File source path.
   * @param ctx Request context.
   */
  get(bucket: string, source: string): Promise<aws.S3.GetObjectOutput> {
    return new Promise((resolve, reject) => {
      this.s3Client.getObject(
        {
          Bucket: bucket,
          Key: source,
        },
        (err, data) => {
          if (err) {
            console.error(err);
            reject(err);
          } else {
            resolve(data);
          }
        },
      );
    });
  }

  /**
   * Removes S3 file.
   * @param source File source path.
   * @param ctx Request context.
   */
  remove(bucket: string, source: string) {
    return new Promise((resolve, reject) => {
      this.s3Client.deleteObject(
        {
          Bucket: bucket,
          Key: source,
        },
        (err, data) => {
          if (err) {
            console.error(err);
            reject(false);
          } else {
            resolve(true);
          }
        },
      );
    });
  }
}
