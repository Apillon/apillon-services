import {
  ApillonApiCreateS3UrlsForUploadDto,
  ApillonApiDirectoryContentQueryFilter,
  ApillonApiFilesQueryFilter,
  BaseProjectQueryFilter,
  BucketQueryFilter,
  CreateBucketDto,
  CreateIpnsDto,
  CreateS3UrlsForUploadDto,
  DirectoryContentQueryFilter,
  EndFileUploadSessionDto,
  FileDetailsQueryFilter,
  IpnsQueryFilter,
  PublishIpnsDto,
  SqlModelStatus,
  StorageMicroservice,
  ValidationException,
  ValidatorErrorCode,
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

  async getIpfsClusterInfo(
    context: ApillonApiContext,
    query: BaseProjectQueryFilter,
  ) {
    return (
      await new StorageMicroservice(context).getIpfsClusterInfo(
        query.project_uuid,
      )
    ).data;
  }

  async getLink(context: ApillonApiContext, cid: string, type: string) {
    return (
      await new StorageMicroservice(context).getLink(
        context.apiKey.project_uuid,
        cid,
        type,
      )
    ).data;
  }

  async listBuckets(context: ApillonApiContext, query: BucketQueryFilter) {
    return (await new StorageMicroservice(context).listBuckets(query)).data;
  }

  async getBucket(context: ApillonApiContext, bucket_uuid: string) {
    return (await new StorageMicroservice(context).getBucket(bucket_uuid)).data;
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

  async deleteFile(context: ApillonApiContext, file_uuid: string) {
    return (
      await new StorageMicroservice(context).deleteFile({ id: file_uuid })
    ).data;
  }

  /**
   * List bucket content in folder structure
   * @param context
   * @param bucket_uuid
   * @param query
   * @returns
   */
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

  /**
   * List files in flat structure
   * @param context
   * @param bucket_uuid
   * @param query
   * @returns
   */
  async listFiles(
    context: ApillonApiContext,
    bucket_uuid: string,
    query: ApillonApiFilesQueryFilter,
  ) {
    query.populate({
      bucket_uuid,
      status: SqlModelStatus.ACTIVE,
      session_uuid: query.sessionUuid,
    });
    return (await new StorageMicroservice(context).listFiles(query)).data;
  }

  async deleteDirectory(context: ApillonApiContext, directory_uuid: string) {
    return (
      await new StorageMicroservice(context).deleteDirectory({
        directory_uuid,
      })
    ).data;
  }

  async getBlacklist(context: ApillonApiContext) {
    return (await new StorageMicroservice(context).getBlacklist()).data;
  }

  //#region ipns methods
  async getIpnsList(
    context: ApillonApiContext,
    bucket_uuid: string,
    query: IpnsQueryFilter,
  ) {
    query.populate({ bucket_uuid });
    return (await new StorageMicroservice(context).listIpnses(query)).data;
  }
  async getIpns(context: ApillonApiContext, ipns_uuid: string) {
    return (await new StorageMicroservice(context).getIpns(ipns_uuid)).data;
  }

  async createIpns(
    context: ApillonApiContext,
    bucket_uuid: string,
    body: CreateIpnsDto,
  ) {
    body.populate({ bucket_uuid: bucket_uuid });
    return (await new StorageMicroservice(context).createIpns(body)).data;
  }
  async updateIpns(context: ApillonApiContext, ipns_uuid: string, body: any) {
    return (
      await new StorageMicroservice(context).updateIpns({
        ipns_uuid,
        data: body,
      })
    ).data;
  }
  async deleteIpns(context: ApillonApiContext, ipns_uuid: string) {
    return (await new StorageMicroservice(context).deleteIpns({ ipns_uuid }))
      .data;
  }

  async publishIpns(
    context: ApillonApiContext,
    ipns_uuid: string,
    body: PublishIpnsDto,
  ) {
    body.populate({ ipns_uuid });
    try {
      await body.validate();
    } catch (err) {
      await body.handle(err);
      if (!body.isValid()) {
        throw new ValidationException(body, ValidatorErrorCode);
      }
    }

    return (await new StorageMicroservice(context).publishIpns(body)).data;
  }

  //#endregion
}
