import type {
  DeleteObjectOutput,
  GetObjectOutput,
  ListObjectsOutput,
  PutObjectOutput,
} from '@aws-sdk/client-s3';
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsCommand,
  ListObjectsV2Command,
  ListObjectsV2Output,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { consumers, Readable } from 'stream';
import { env } from '../../config/env';

export class AWS_S3 {
  private s3Client: S3Client;

  constructor() {
    try {
      if (env.AWS_KEY && env.AWS_SECRET) {
        this.s3Client = new S3Client({
          region: env.AWS_REGION,
          credentials: {
            accessKeyId: env.AWS_KEY,
            secretAccessKey: env.AWS_SECRET,
          },
        });
      } else {
        this.s3Client = new S3Client({
          region: env.AWS_REGION,
        });
      }
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
   * @param startAfter StartAfter is where you want Amazon S3 to start listing from. Amazon S3 starts listing after this specified key. StartAfter can be any key in the bucket.
   * @returns
   */
  async listFiles(
    bucket: string,
    prefix: string,
    startAfter?: string,
  ): Promise<ListObjectsV2Output> {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      StartAfter: startAfter,
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
   * Removes files from S3.
   * @param source File source path.
   * @param ctx Request context.
   */
  async removeFiles(bucket: string, keys: { Key: string }[]): Promise<boolean> {
    let counter = 0;
    do {
      const command = new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: keys.slice(counter, counter + 1000) },
      });
      await this.s3Client.send(command);
      counter += 1000;
    } while (counter < keys.length);

    return true;
  }

  /**
   * Fetch all files with specific key prefix ("directory") and deletes them
   * @param bucket
   * @param directory key prefix
   * @returns
   */
  async removeDirectory(bucket: string, directory: string): Promise<boolean> {
    let files: ListObjectsV2Output = undefined;
    do {
      files = await this.listFiles(bucket, directory);
      if (files.KeyCount > 0) {
        const command = new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: files.Contents.map((x) => ({
              Key: x.Key,
            })),
          },
        });
        await this.s3Client.send(command);
      }
    } while (files.KeyCount > 0);

    return true;
  }
}
