import { AWS_S3, env, ServiceName } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { FileUploadRequest } from '../modules/storage/models/file-upload-request.model';
import { v4 as uuidV4 } from 'uuid';
import { StorageCodeException } from './exceptions';
import { StorageErrorCode } from '../config/types';

export async function createFURAndS3Url(
  context: ServiceContext,
  s3FileKey,
  fileMetadata,
  session,
  bucket,
  s3Client: AWS_S3,
) {
  //check if fileUploadRequest with that key already exists
  let fur: FileUploadRequest = await new FileUploadRequest(
    {},
    context,
  ).populateByS3FileKey(s3FileKey);

  if (!fur.exists()) {
    fur = new FileUploadRequest(fileMetadata, context).populate({
      file_uuid: uuidV4(),
      session_id: session?.id,
      bucket_id: bucket.id,
      s3FileKey: s3FileKey,
    });

    await fur.insert();
  }
  fileMetadata.file_uuid = fur.file_uuid;

  try {
    fileMetadata.url = await s3Client.generateSignedUploadURL(
      env.STORAGE_AWS_IPFS_QUEUE_BUCKET,
      s3FileKey,
    );
  } catch (err) {
    throw await new StorageCodeException({
      code: StorageErrorCode.ERROR_AT_GENERATE_S3_SIGNED_URL,
      status: 500,
    }).writeToMonitor({
      context,
      project_uuid: bucket.project_uuid,
      service: ServiceName.STORAGE,
      data: {
        fileUploadRequest: fur,
      },
    });
  }

  return fileMetadata;
}
