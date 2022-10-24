import { AWS_S3, CreateS3SignedUrlForUploadDto, env } from 'at-lib';
import { StorageErrorCode } from '../../config/types';
import { ServiceContext } from '../../context';
import { StorageCodeException } from '../../lib/exceptions';
import { Bucket } from '../bucket/models/bucket.model';
import { FileUploadRequest } from './models/file-upload-request.model';
import { FileUploadSession } from './models/file-upload-session.model';

export class StorageService {
  static async generateS3SignedUrlForUpload(
    event: { body: CreateS3SignedUrlForUploadDto },
    context: ServiceContext,
  ): Promise<any> {
    //First create fileUploadSession & fileUploadRequest records in DB, then generate S3 signed url for upload
    let session: FileUploadSession = undefined;

    if (event.body.session_uuid) {
      //Get existing or create new fileUploadSession
      session = await new FileUploadSession({}, context).populateByUUID(
        event.body.session_uuid,
      );

      if (!session.exists()) {
        //create new session
        session = new FileUploadSession(
          { session_uuid: event.body.session_uuid },
          context,
        );
        await session.create();
      }
    }

    //get bucket
    const bucket: Bucket = await new Bucket({}, context).populateByUUID(
      event.body.bucket_uuid,
    );

    if (!bucket.exists()) {
      throw new StorageCodeException({
        code: StorageErrorCode.BUCKET_NOT_FOUND,
        status: 404,
      });
    }

    const fur: FileUploadRequest = new FileUploadRequest(
      event.body,
      context,
    ).populate({
      session_id: session?.id,
      bucket_id: bucket.id,
      s3FileKey: event.body.fileName,
    });

    await fur.create();

    const s3Client: AWS_S3 = new AWS_S3();
    const signedURLForUpload = await s3Client.generateSignedUploadURL(
      env.AT_STORAGE_AWS_IPFS_QUEUE_BUCKET,
      `${bucket.id}/${session.session_uuid}/${
        (event.body.path ? event.body.path + '/' : '') + event.body.fileName
      }`,
    );

    return { signedUrlForUpload: signedURLForUpload };
  }
}
