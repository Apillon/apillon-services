import { AWS_S3 } from 'at-lib';
import { v4 as uuidv4 } from 'uuid';

export class StorageService {
  static async generateS3SignedUrlForUpload(params: {
    session_uuid: string;
    bucket_uuid: string;
    directory_uuid?: string;
    path?: string;
    fileName: string;
    contentType: string;
  }) {
    //Get File from S3
    const s3Client: AWS_S3 = new AWS_S3();

    const signedURLForUpload = await s3Client.generateSignedUploadURL(
      'atv2',
      params.fileName,
    );

    return { success: true, data: { signedUrlForUpload: signedURLForUpload } };
  }
}
