import {
  CreateS3SignedUrlForUploadDto,
  EndFileUploadSessionDto,
  FileDetailsQueryFilter,
  StorageMicroservice,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
@Injectable()
export class StorageService {
  async endFileUploadSession(
    context: DevConsoleApiContext,
    bucket_uuid: string,
    session_uuid: string,
    body: EndFileUploadSessionDto,
  ) {
    return (
      await new StorageMicroservice(
        context,
      ).endFileUploadSessionAndExecuteSyncToIPFS(session_uuid, body)
    ).data;
  }
  async createS3SignedUrlForUpload(
    context: DevConsoleApiContext,
    bucket_uuid: string,
    session_uuid: string,
    body: CreateS3SignedUrlForUploadDto,
  ) {
    body.bucket_uuid = bucket_uuid;
    body.session_uuid = session_uuid;
    return (
      await new StorageMicroservice(context).requestS3SignedURLForUpload(body)
    ).data;
  }

  async getFileDetails(
    context: DevConsoleApiContext,
    bucket_uuid: string,
    cidOrUUID: string,
  ) {
    const filter: FileDetailsQueryFilter = new FileDetailsQueryFilter(
      { bucket_uuid: bucket_uuid, CIDOrUUID: cidOrUUID },
      context,
    );
    return (await new StorageMicroservice(context).getFileDetails(filter)).data;
  }
}
