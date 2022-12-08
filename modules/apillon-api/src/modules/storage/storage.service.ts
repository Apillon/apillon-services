import {
  ApillonApiDirectoryContentQueryFilter,
  CreateS3SignedUrlForUploadDto,
  DirectoryContentQueryFilter,
  EndFileUploadSessionDto,
  FileDetailsQueryFilter,
  StorageMicroservice,
  ValidationException,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';

@Injectable()
export class StorageService {
  async createS3SignedUrlForUpload(
    context: ApillonApiContext,
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

  async endFileUploadSession(
    context: ApillonApiContext,
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

  async getFileDetails(
    context: ApillonApiContext,
    bucket_uuid: string,
    id: string,
  ) {
    const filter: FileDetailsQueryFilter = new FileDetailsQueryFilter(
      { bucket_uuid: bucket_uuid, id: id },
      context,
    );
    return (await new StorageMicroservice(context).getFileDetails(filter)).data;
  }

  async listContent(
    context: ApillonApiContext,
    bucket_uuid: string,
    query: ApillonApiDirectoryContentQueryFilter,
  ) {
    query.bucket_uuid = bucket_uuid;

    try {
      await query.validate();
    } catch (err) {
      await query.handle(err);
      if (!query.isValid()) throw new ValidationException(query);
    }
    return (await new StorageMicroservice(context).listDirectoryContent(query))
      .data;
  }
}
