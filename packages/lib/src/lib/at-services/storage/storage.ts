import { env } from '../../../config/env';
import { AppEnvironment, StorageEventType } from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { BucketQuotaReachedQueryFilter } from './dtos/bucket-qouta-reached-query-filter.dto';
import { BucketQueryFilter } from './dtos/bucket-query-filter.dto';
import { CreateBucketWebhookDto } from './dtos/create-bucket-webhook.dto';
import { CreateBucketDto } from './dtos/create-bucket.dto';
import { CreateDirectoryDto } from './dtos/create-directory.dto';
import { CreateIpnsDto } from './dtos/create-ipns.dto';
import { DirectoryContentQueryFilter } from './dtos/directory-content-query-filter.dto';
import { EndFileUploadSessionDto } from './dtos/end-file-upload-session.dto';
import { FileDetailsQueryFilter } from './dtos/file-details-query-filter.dto';
import { FileUploadsQueryFilter } from './dtos/file-uploads-query-filter.dto';
import { TrashedFilesQueryFilter } from './dtos/trashed-files-query-filter.dto';
import { IpnsQueryFilter } from './dtos/ipns-query-filter.dto';
import { PublishIpnsDto } from './dtos/publish-ipns.dto';
import { WebsiteQueryFilter } from './dtos/website-query-filter.dto';
import { CreateWebsiteDto } from './dtos/create-website.dto';
import { DeployWebsiteDto } from './dtos/deploy-website.dto';
import { DeploymentQueryFilter } from './dtos/deployment-query-filter.dto';
import { WebsitesQuotaReachedQueryFilter } from './dtos/websites-quota-reached-query-filter.dto';
import {
  ApillonHostingApiCreateS3UrlsForUploadDto,
  CreateS3UrlsForUploadDto,
} from './dtos/create-s3-urls-for-upload.dto';

export class StorageMicroservice extends BaseService {
  lambdaFunctionName =
    env.APP_ENV === AppEnvironment.TEST
      ? env.STORAGE_FUNCTION_NAME_TEST
      : env.STORAGE_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.STORAGE_SOCKET_PORT_TEST
      : env.STORAGE_SOCKET_PORT;
  serviceName = 'STORAGE';

  constructor(context: Context) {
    super(context);
    this.isDefaultAsync = false;
  }

  //#region bucket CRUD

  public async listBuckets(params: BucketQueryFilter) {
    const data = {
      eventName: StorageEventType.LIST_BUCKETS,
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  public async getBucket(id: string | number) {
    const data = {
      eventName: StorageEventType.GET_BUCKET,
      id: id,
    };
    return await this.callService(data);
  }

  public async createBucket(params: CreateBucketDto) {
    const data = {
      eventName: StorageEventType.CREATE_BUCKET,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async updateBucket(params: { id: number; data: any }) {
    const data = {
      eventName: StorageEventType.UPDATE_BUCKET,
      ...params,
    };
    return await this.callService(data);
  }

  public async deleteBucket(params: { id: number }) {
    const data = {
      eventName: StorageEventType.DELETE_BUCKET,
      ...params,
    };
    return await this.callService(data);
  }

  public async cancelBucketDeletion(params: { id: number }) {
    const data = {
      eventName: StorageEventType.CANCEL_DELETE_BUCKET,
      ...params,
    };
    return await this.callService(data);
  }

  public async clearBucketContent(params: { id: number }) {
    const data = {
      eventName: StorageEventType.BUCKET_CLEAR_CONTENT,
      ...params,
    };
    return await this.callService(data);
  }

  public async maxBucketQuotaReached(params: BucketQuotaReachedQueryFilter) {
    const data = {
      eventName: StorageEventType.MAX_BUCKETS_QUOTA_REACHED,
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  //#endregion

  //#region Directory CRUD

  public async createDirectory(params: CreateDirectoryDto) {
    const data = {
      eventName: StorageEventType.CREATE_DIRECTORY,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async updateDirectory(params: { id: number; data: any }) {
    const data = {
      eventName: StorageEventType.UPDATE_DIRECTROY,
      ...params,
    };
    return await this.callService(data);
  }

  public async deleteDirectory(params: { id: number }) {
    const data = {
      eventName: StorageEventType.DELETE_DIRECTORY,
      ...params,
    };
    return await this.callService(data);
  }

  public async cancelDirectoryDeletion(params: { id: number }) {
    const data = {
      eventName: StorageEventType.CANCEL_DELETE_DIRECTORY,
      ...params,
    };
    return await this.callService(data);
  }

  public async listDirectoryContent(params: DirectoryContentQueryFilter) {
    const data = {
      eventName: StorageEventType.LIST_DIRECTORY_CONTENT,
      query: params.serialize(),
    };
    return await this.callService(data);
  }
  //#endregion

  //#region upload files to S3, IPFS & pin to crust

  public async requestS3SignedURLsForUpload(params: CreateS3UrlsForUploadDto) {
    const data = {
      eventName: StorageEventType.REQUEST_S3_SIGNED_URLS_FOR_UPLOAD,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async endFileUploadSession(
    session_uuid: string,
    params: EndFileUploadSessionDto,
  ) {
    const data = {
      eventName: StorageEventType.END_FILE_UPLOAD_SESSION,
      session_uuid: session_uuid,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async syncFileToIPFS(file_uuid: string) {
    const data = {
      eventName: StorageEventType.END_FILE_UPLOAD,
      file_uuid: file_uuid,
    };
    return await this.callService(data);
  }

  public async listFileUploads(params: FileUploadsQueryFilter) {
    const data = {
      eventName: StorageEventType.LIST_FILE_UPLOAD,
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  //#endregion

  //#region file

  public async getFileDetails(params: FileDetailsQueryFilter) {
    const data = {
      eventName: StorageEventType.GET_FILE_DETAILS,
      ...params.serialize(),
    };
    return await this.callService(data);
  }

  public async listFilesMarkedForDeletion(params: TrashedFilesQueryFilter) {
    const data = {
      eventName: StorageEventType.LIST_FILES_MARKED_FOR_DELETION,
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  public async deleteFile(params: { id: string }) {
    const data = {
      eventName: StorageEventType.FILE_DELETE,
      ...params,
    };
    return await this.callService(data);
  }

  public async cancelFileDeletion(params: { id: string }) {
    const data = {
      eventName: StorageEventType.CANCEL_FILE_DELETE,
      ...params,
    };
    return await this.callService(data);
  }

  //#endregion

  //#region bucket webhook

  public async getBucketWebhook(bucket_id: number) {
    const data = {
      eventName: StorageEventType.BUCKET_WEBHOOK_GET,
      bucket_id: bucket_id,
    };
    return await this.callService(data);
  }

  public async createBucketWebhook(params: CreateBucketWebhookDto) {
    const data = {
      eventName: StorageEventType.BUCKET_WEBHOOK_CREATE,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async updateBucketWebhook(params: { id: number; data: any }) {
    const data = {
      eventName: StorageEventType.BUCKET_WEBHOOK_UPDATE,
      ...params,
    };
    return await this.callService(data);
  }

  public async deleteBucketWebhook(params: { id: number }) {
    const data = {
      eventName: StorageEventType.BUCKET_WEBHOOK_DELETE,
      ...params,
    };
    return await this.callService(data);
  }

  //#endregion

  //#region ipns

  public async listIpnses(params: IpnsQueryFilter) {
    const data = {
      eventName: StorageEventType.IPNS_LIST,
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  public async getIpns(id: number) {
    const data = {
      eventName: StorageEventType.IPNS_GET,
      id: id,
    };
    return await this.callService(data);
  }

  public async createIpns(params: CreateIpnsDto) {
    const data = {
      eventName: StorageEventType.IPNS_CREATE,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async publishIpns(params: PublishIpnsDto) {
    const data = {
      eventName: StorageEventType.IPNS_PUBLISH,
      ...params.serialize(),
    };
    return await this.callService(data);
  }

  public async updateIpns(params: { id: number; data: any }) {
    const data = {
      eventName: StorageEventType.IPNS_UPDATE,
      ...params,
    };
    return await this.callService(data);
  }

  public async deleteIpns(params: { id: number }) {
    const data = {
      eventName: StorageEventType.IPNS_DELETE,
      ...params,
    };
    return await this.callService(data);
  }

  //#endregion

  //#region web pages, deployment

  public async requestS3SignedURLsForWebsiteUpload(
    params: ApillonHostingApiCreateS3UrlsForUploadDto,
  ) {
    const data = {
      eventName: StorageEventType.REQUEST_S3_SIGNED_URLS_FOR_WEBSITE_UPLOAD,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async listWebsites(params: WebsiteQueryFilter) {
    const data = {
      eventName: StorageEventType.WEBSITE_LIST,
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  public async getWebsite(id: number) {
    const data = {
      eventName: StorageEventType.WEBSITE_GET,
      id: id,
    };
    return await this.callService(data);
  }

  public async createWebsite(params: CreateWebsiteDto) {
    const data = {
      eventName: StorageEventType.WEBSITE_CREATE,
      body: params.serialize(),
    };
    return await this.callService(data);
  }
  public async updateWebsite(params: { id: number; data: any }) {
    const data = {
      eventName: StorageEventType.WEBSITE_UPDATE,
      ...params,
    };
    return await this.callService(data);
  }

  public async maxWebsitesQuotaReached(
    params: WebsitesQuotaReachedQueryFilter,
  ) {
    const data = {
      eventName: StorageEventType.WEBSITE_QUOTA_REACHED,
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  public async deployWebsite(params: DeployWebsiteDto) {
    const data = {
      eventName: StorageEventType.WEBSITE_DEPLOY,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async listDomains() {
    const data = {
      eventName: StorageEventType.WEBSITE_LIST_DOMAINS,
    };
    return await this.callService(data);
  }

  public async listDeployments(params: DeploymentQueryFilter) {
    const data = {
      eventName: StorageEventType.DEPLOYMENT_LIST,
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  public async getDeployment(id: number) {
    const data = {
      eventName: StorageEventType.DEPLOYMENT_GET,
      id: id,
    };
    return await this.callService(data);
  }

  //#endregion

  //#region nfts storage functions

  public async executePrepareCollectionBaseUriWorker(params: {
    bucket_uuid: string;
    collection_uuid: string;
    collectionName: string;
    imagesSession: string;
    metadataSession: string;
  }): Promise<{ data: { baseUri: string } }> {
    const data = {
      eventName: StorageEventType.EXECUTE_PREPARE_COLLECTION_BASE_URI_WORKER,
      body: params,
    };
    return await this.callService(data);
  }

  //#endregion
}
