import { AWS_S3, env } from '@apillon/lib';
import { BucketType, StorageErrorCode } from '../config/types';
import { StorageCodeException } from '../lib/exceptions';
import { Bucket } from '../modules/bucket/models/bucket.model';
import { FileUploadSession } from '../modules/storage/models/file-upload-session.model';

/**
 *
 * @param bucket
 * @param session
 * @returns size of files and array of files with properties: (https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/modules/_object.html)
 */
export async function getSessionFilesOnS3(
  bucket: Bucket,
  session: FileUploadSession,
): Promise<{ size: number; files: any[] }> {
  const s3Client: AWS_S3 = new AWS_S3();
  /**
   * Array of s3FileLists - actually array of array (chunks of 1000 files)
   */
  const s3FileLists: any[] = [];
  let s3FileList: any = undefined;
  do {
    s3FileList = await s3Client.listFiles(
      env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
      `${BucketType[bucket.bucketType]}${
        session?.session_uuid ? '_sessions' : ''
      }/${bucket.id}/${session?.session_uuid}`,
    );
    if (s3FileList.Contents?.length > 0) {
      s3FileLists.push(s3FileList);
    }
  } while (s3FileList.Contents?.length == 1000);

  if (s3FileLists.length == 0) {
    throw new StorageCodeException({
      code: StorageErrorCode.NO_FILES_ON_S3_FOR_TRANSFER,
      status: 404,
    });
  }

  let sizeOfFilesOnS3 = 0;
  const files: any[] = [];
  for (const tmpS3FileList of s3FileLists) {
    const tmpSize = tmpS3FileList.Contents.reduce(
      (size, x) => size + x.Size,
      0,
    );
    sizeOfFilesOnS3 += tmpSize;
    files.push(...tmpS3FileList.Contents);
  }

  return { size: sizeOfFilesOnS3, files: files };
}
