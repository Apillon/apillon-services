import {
  CreateS3SignedUrlForUploadDto,
  EndFileUploadSessionDto,
  FileDetailsQueryFilter,
  StorageMicroservice,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';

@Injectable()
export class StorageService {
  async createS3SignedUrlForUpload(
    context: ApillonApiContext,
    body: CreateS3SignedUrlForUploadDto,
  ) {
    return (
      await new StorageMicroservice(context).requestS3SignedURLForUpload(body)
    ).data;
  }

  async endFileUploadSession(
    context: ApillonApiContext,
    session_uuid: string,
    body: EndFileUploadSessionDto,
  ) {
    return (
      await new StorageMicroservice(
        context,
      ).endFileUploadSessionAndExecuteSyncToIPFS(session_uuid, body)
    ).data;
  }

  async getFileDetailsByCID(context: ApillonApiContext, cid: string) {
    const filter: FileDetailsQueryFilter = new FileDetailsQueryFilter(
      { cid: cid },
      context,
    );
    return (await new StorageMicroservice(context).getFileDetails(filter)).data;
  }

  async getFileDetailsByFileUUID(
    context: ApillonApiContext,
    file_uuid: string,
  ) {
    const filter: FileDetailsQueryFilter = new FileDetailsQueryFilter(
      { file_uuid: file_uuid },
      context,
    );
    return (await new StorageMicroservice(context).getFileDetails(filter)).data;
  }
}
