import {
  CreateS3UrlForUploadDto,
  CreateS3UrlsForUploadDto,
  EndFileUploadSessionDto,
  FileDetailsQueryFilter,
  FileUploadsQueryFilter,
  StorageMicroservice,
  TrashedFilesQueryFilter,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
@Injectable()
export class StorageService {
  async listFileUploads(
    context: DevConsoleApiContext,
    bucket_uuid: string,
    query: FileUploadsQueryFilter,
  ) {
    query.bucket_uuid = bucket_uuid;
    return (await new StorageMicroservice(context).listFileUploads(query)).data;
  }
  async endFileUploadSession(
    context: DevConsoleApiContext,
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

  async createS3SignedUrlsForUpload(
    context: DevConsoleApiContext,
    bucket_uuid: string,
    body: CreateS3UrlsForUploadDto,
  ) {
    body.bucket_uuid = bucket_uuid;
    return (
      await new StorageMicroservice(context).requestS3SignedURLsForUpload(body)
    ).data;
  }

  async syncFileToIPFS(context: DevConsoleApiContext, file_uuid: string) {
    return (await new StorageMicroservice(context).syncFileToIPFS(file_uuid))
      .data;
  }

  async getFileDetails(
    context: DevConsoleApiContext,
    bucket_uuid: string,
    id: string,
  ) {
    const filter: FileDetailsQueryFilter = new FileDetailsQueryFilter(
      { bucket_uuid: bucket_uuid, id: id },
      context,
    );
    return (await new StorageMicroservice(context).getFileDetails(filter)).data;
  }

  async listFilesMarkedForDeletion(
    context: DevConsoleApiContext,
    bucket_uuid: string,
    query: TrashedFilesQueryFilter,
  ) {
    query.populate({ bucket_uuid });
    return (
      await new StorageMicroservice(context).listFilesMarkedForDeletion(query)
    ).data;
  }

  async deleteFile(context: DevConsoleApiContext, id: string) {
    return (await new StorageMicroservice(context).deleteFile({ id })).data;
  }

  async cancelFileDeletion(context: DevConsoleApiContext, id: string) {
    return (await new StorageMicroservice(context).cancelFileDeletion({ id }))
      .data;
  }
}
