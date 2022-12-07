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
    body: CreateS3SignedUrlForUploadDto,
  ) {
    return (
      await new StorageMicroservice(context).requestS3SignedURLForUpload(body)
    ).data;
  }

  async getFileDetails(
    context: DevConsoleApiContext,
    query: FileDetailsQueryFilter,
  ) {
    return (await new StorageMicroservice(context).getFileDetails(query)).data;
  }
}
