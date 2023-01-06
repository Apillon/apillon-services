import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  ListObjectsCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import type {
  GetObjectOutput,
  ListObjectsOutput,
  PutObjectOutput,
  DeleteObjectOutput,
  DeleteObjectsOutput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../config/env';
import { consumers, Readable } from 'stream';

export class AWS_S3 {
  private s3Client: S3Client;

  constructor() {
    try {
      this.s3Client = new S3Client({
        // credentials: {
        //   accessKeyId: env.AWS_KEY,
        //   secretAccessKey: env.AWS_SECRET,
        // },
        region: env.AWS_REGION,
      });
    } catch (err) {
      console.error(
        'error creating AWS S3 client',
        {
          params: {
            // key: env.AWS_KEY,
            // secret: env.AWS_SECRET,
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
  async exists(bucket: string, source: string): Promise<boolean> {
    const command = new HeadObjectCommand({ Bucket: bucket, Key: source });
    try {
      await this.s3Client.send(command);
    } catch (err) {
      console.error('headObject error', err);
      return false;
    }
    return true;
  }

  /**
   * Creates S3 file.
   * @param source File source path.
   * @param body File to be uploaded.
   * @param ctx Request context.
   */
  async upload(
    bucket: string,
    source: string,
    body: Blob | Buffer | ReadableStream,
    contentType: string,
  ): Promise<PutObjectOutput> {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: source,
      Body: body,
      ContentType: contentType,
    });
    return await this.s3Client.send(command);
  }

  /**
   * Retrieves S3 file.
   * @param source File source path.
   * @param ctx Request context.
   */
  async get(bucket: string, source: string): Promise<GetObjectOutput> {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: source,
    });
    return await this.s3Client.send(command);
  }

  /**
   * Reads file stream and returns body as string
   * @param bucket S3 bucket
   * @param source File source path
   * @returns string
   */
  async read(bucket: string, source: string): Promise<string> {
    const resp = await this.get(bucket, source);
    return consumers.text(resp.Body as Readable);
  }

  /**
   *  Lists up to 1000 files for specific prefix
   * @param bucket s3 bucket
   * @param prefix Limits the response to keys that begin with the specified prefix.
   * @returns
   */
  async listFiles(bucket: string, prefix: string): Promise<ListObjectsOutput> {
    const command = new ListObjectsCommand({
      Bucket: bucket,
      Prefix: prefix,
    });
    return await this.s3Client.send(command);
  }

  /**
   * Retrieves S3 directory.
   * @param source File source path.
   * @param ctx Request context.
   */
  async listBucket(bucket: string): Promise<ListObjectsOutput> {
    const command = new ListObjectsCommand({
      Bucket: bucket,
    });
    return await this.s3Client.send(command);
  }

  /**
   * Generate signed upload link
   * AWS s3. Docs for putObject: https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutObject.html
   * @param source File source path.
   * @param ctx Request context.
   */
  async generateSignedUploadURL(bucket: string, key: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    return await getSignedUrl(this.s3Client, command);
  }

  /**
   * Removes S3 file.
   * @param source File source path.
   * @param ctx Request context.
   */
  async remove(bucket: string, source: string): Promise<DeleteObjectOutput> {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: source,
    });
    return await this.s3Client.send(command);
  }

  /**
   * Removes up to 1000 S3 files.
   * @param source File source path.
   * @param ctx Request context.
   */
  async removeFiles(
    bucket: string,
    keys: { Key: string }[],
  ): Promise<DeleteObjectsOutput> {
    const command = new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: keys },
    });
    return await this.s3Client.send(command);
  }
}
