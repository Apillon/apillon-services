import {
  ApillonApiBucketQueryFilter,
  ApillonApiCreateS3UrlsForUploadDto,
  ApillonApiDirectoryContentQueryFilter,
  BaseProjectQueryFilter,
  CreateBucketDto,
  CreateS3UrlsForUploadDto,
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
  async getStorageInfo(
    context: ApillonApiContext,
    query: BaseProjectQueryFilter,
  ) {
    return (
      await new StorageMicroservice(context).getStorageInfo(query.project_uuid)
    ).data;
  }

  async listBuckets(
    context: ApillonApiContext,
    query: ApillonApiBucketQueryFilter,
  ) {
    return (await new StorageMicroservice(context).listBuckets(query)).data;
  }

  async createBucket(context: ApillonApiContext, body: CreateBucketDto) {
    body.bucketType = 1;
    //Call Storage microservice, to create bucket
    return (await new StorageMicroservice(context).createBucket(body)).data;
  }

  async createS3SignedUrlsForUpload(
    context: ApillonApiContext,
    bucket_uuid: string,
    body: ApillonApiCreateS3UrlsForUploadDto,
  ) {
    return (
      await new StorageMicroservice(context).requestS3SignedURLsForUpload(
        new CreateS3UrlsForUploadDto().populate({
          ...body.serialize(),
          bucket_uuid: bucket_uuid,
          session_uuid: body.sessionUuid,
        }),
      )
    ).data;
  }

  async endFileUploadSession(
    context: ApillonApiContext,
    bucket_uuid: string,
    session_uuid: string,
    body: EndFileUploadSessionDto,
  ) {
    return (
      await new StorageMicroservice(context).endFileUploadSession(
        session_uuid,
        body,
      )
    ).data;
  }

  /**
   * Only for testing purposes
   */
  async syncFileToIPFS(context: ApillonApiContext, file_uuid: string) {
    return (await new StorageMicroservice(context).syncFileToIPFS(file_uuid))
      .data;
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

  async deleteFile(context: ApillonApiContext, id: string) {
    return (await new StorageMicroservice(context).deleteFile({ id })).data;
  }

  async listContent(
    context: ApillonApiContext,
    bucket_uuid: string,
    query: ApillonApiDirectoryContentQueryFilter,
  ) {
    try {
      await query.validate();
    } catch (err) {
      await query.handle(err);
      if (!query.isValid()) {
        throw new ValidationException(query);
      }
    }
    return (
      await new StorageMicroservice(context).listDirectoryContent(
        new DirectoryContentQueryFilter().populate({
          ...query.serialize(),
          bucket_uuid: bucket_uuid,
          directory_uuid: query.directoryUuid,
        }),
      )
    ).data;
  }
}
