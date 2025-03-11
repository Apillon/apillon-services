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
import { DomainQueryFilter } from './dtos/domain-query-filter.dto';
import { FilesQueryFilter } from './dtos/files-query-filter.dto';
import { FileUploadSessionQueryFilter } from './dtos/file-upload-session-query-filter.dto';
import { CollectionMetadataQueryFilter } from './dtos/collection-metadata-query-filter.dto';
import { ShortUrlDto } from './dtos/short-url.dto';
import { GetLinksDto } from './dtos/get-links.dto';
import { CreateDeploymentConfigDto } from './dtos/create-deployment-config.dto';
import { GithubLinkDto } from './dtos/github-link.dto';
import { DeploymentBuildQueryFilter } from './dtos/deployment-build-query-filter.dto';
import { GithubUnlinkDto } from './dtos/github-unlink.dto';
import { SetEnvironmentVariablesDto } from './dtos/set-environment-variables.dto';
import { UpdateDeploymentConfigDto } from './dtos/update-deployment-config.dto';
import { NftWebsiteDeployDto } from './dtos/nft-website-deploy.dto';
import { WebsiteDeployDto } from './dtos/website-deploy.dto';

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

  public async getStorageInfo(project_uuid: string): Promise<{
    data: {
      availableStorage: number;
      usedStorage: number;
      availableBandwidth: number;
      usedBandwidth: number;
    };
  }> {
    const data = {
      eventName: StorageEventType.STORAGE_INFO,
      project_uuid,
    };
    return await this.callService(data);
  }

  public async getProjectsOverBandwidthQuota(query: DomainQueryFilter) {
    const data = {
      eventName: StorageEventType.PROJECTS_OVER_BANDWIDTH_QUOTA,
      query: query.serialize(),
    };
    return await this.callService(data);
  }

  //#region bucket CRUD

  public async listBuckets(params: BucketQueryFilter) {
    const data = {
      eventName: StorageEventType.LIST_BUCKETS,
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  public async getBucket(bucket_uuid: string) {
    const data = {
      eventName: StorageEventType.GET_BUCKET,
      bucket_uuid,
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

  public async updateBucket(params: { bucket_uuid: string; data: any }) {
    const data = {
      eventName: StorageEventType.UPDATE_BUCKET,
      ...params,
    };
    return await this.callService(data);
  }

  public async deleteBucket(params: { bucket_uuid: string }) {
    const data = {
      eventName: StorageEventType.DELETE_BUCKET,
      ...params,
    };
    return await this.callService(data);
  }

  public async clearBucketContent(params: { bucket_uuid: string }) {
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

  public async getProjectStorageDetails(project_uuid: string) {
    const data = {
      eventName: StorageEventType.PROJECT_STORAGE_DETAILS,
      project_uuid,
    };
    return await this.callService(data);
  }

  public async getProjectIpfsCluster(project_uuid: string) {
    const data = {
      eventName: StorageEventType.GET_PROJECT_IPFS_CLUSTER,
      project_uuid,
    };
    return await this.callService(data);
  }

  public async getIpfsClusterInfo(project_uuid: string) {
    const data = {
      eventName: StorageEventType.GET_IPFS_CLUSTER_INFO,
      project_uuid,
    };
    return await this.callService(data);
  }

  public async getLink(project_uuid: string, cid: string, type: string) {
    const data = {
      eventName: StorageEventType.GET_LINK,
      project_uuid,
      cid,
      type,
    };
    return await this.callService(data);
  }

  public async getLinks(project_uuid: string, body: GetLinksDto) {
    const data = {
      eventName: StorageEventType.GET_LINKS,
      project_uuid,
      body: body.serialize(),
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

  public async updateDirectory(params: { directory_uuid: string; data: any }) {
    const data = {
      eventName: StorageEventType.UPDATE_DIRECTROY,
      ...params,
    };
    return await this.callService(data);
  }

  public async deleteDirectory(params: { directory_uuid: string }) {
    const data = {
      eventName: StorageEventType.DELETE_DIRECTORY,
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

  public async listFileUploadSessions(params: FileUploadSessionQueryFilter) {
    const data = {
      eventName: StorageEventType.LIST_FILE_UPLOAD_SESSIONS,
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

  public async listFiles(params: FilesQueryFilter) {
    const data = {
      eventName: StorageEventType.LIST_FILES,
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  public async deleteFile(params: { uuid: string }) {
    const data = {
      eventName: StorageEventType.FILE_DELETE,
      ...params,
    };
    return await this.callService(data);
  }

  public async restoreFile(params: { uuid: string }) {
    const data = {
      eventName: StorageEventType.RESTORE_FILE,
      ...params,
    };
    return await this.callService(data);
  }

  //#endregion

  //#region bucket webhook

  public async getBucketWebhook(bucket_uuid: string) {
    const data = {
      eventName: StorageEventType.BUCKET_WEBHOOK_GET,
      bucket_uuid,
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

  public async getIpns(ipns_uuid: string) {
    const data = {
      eventName: StorageEventType.IPNS_GET,
      ipns_uuid,
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

  public async updateIpns(params: { ipns_uuid: string; data: any }) {
    const data = {
      eventName: StorageEventType.IPNS_UPDATE,
      ...params,
    };
    return await this.callService(data);
  }

  public async deleteIpns(params: { ipns_uuid: string }) {
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

  public async getWebsite(website_uuid: string) {
    const data = {
      eventName: StorageEventType.WEBSITE_GET,
      id: website_uuid,
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

  public async updateWebsite(params: { website_uuid: string; data: any }) {
    const data = {
      eventName: StorageEventType.WEBSITE_UPDATE,
      ...params,
    };
    return await this.callService(data);
  }

  public async archiveWebsite(website_uuid: string) {
    const data = {
      eventName: StorageEventType.WEBSITE_ARCHIVE,
      website_uuid,
    };
    return await this.callService(data);
  }

  public async activateWebsite(website_uuid: string) {
    const data = {
      eventName: StorageEventType.WEBSITE_ACTIVATE,
      website_uuid,
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

  public async listDomains(query: DomainQueryFilter) {
    const data = {
      eventName: StorageEventType.WEBSITE_LIST_DOMAINS,
      query: query.serialize(),
    };
    return await this.callService(data);
  }

  public async getDomains() {
    const data = {
      eventName: StorageEventType.WEBSITE_GET_ALL_DOMAINS,
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

  public async getDeployment(deployment_uuid: string) {
    const data = {
      eventName: StorageEventType.DEPLOYMENT_GET,
      deployment_uuid,
    };
    return await this.callService(data);
  }

  public async approveWebsiteDeployment(deployment_uuid: string) {
    const data = {
      eventName: StorageEventType.DEPLOYMENT_APPROVE,
      deployment_uuid,
    };
    return await this.callService(data);
  }

  public async rejectWebsiteDeployment(deployment_uuid: string) {
    const data = {
      eventName: StorageEventType.DEPLOYMENT_REJECT,
      deployment_uuid,
    };
    return await this.callService(data);
  }

  public async checkWebsiteDomainDns(website_uuid: string) {
    const data = {
      eventName: StorageEventType.WEBSITE_CHECK_DOMAIN_DNS,
      website_uuid,
    };
    return await this.callService(data);
  }

  public async removeWebsiteDomain(website_uuid: string) {
    const data = {
      eventName: StorageEventType.WEBSITE_REMOVE_DOMAIN,
      website_uuid,
    };
    return await this.callService(data);
  }

  //#endregion

  //#region nfts storage functions

  public async prepareCollectionBaseUri(params: {
    bucket_uuid: string;
    collection_uuid: string;
    collectionName: string;
    imagesSession: string;
    metadataSession: string;
    useApillonIpfsGateway: boolean;
    useIpns: boolean;
  }): Promise<{ data: { baseUri: string } }> {
    const data = {
      eventName: StorageEventType.PREPARE_COLLECTION_BASE_URI,
      body: params,
    };
    return await this.callService(data);
  }

  public async listCollectionMetadata(params: CollectionMetadataQueryFilter) {
    const data = {
      eventName: StorageEventType.COLLECTION_METADATA_LIST,
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  //#endregion

  //#region test/helper functions

  public async testCrustProvider(providerEndpoint: string) {
    const data = {
      eventName: StorageEventType.TEST_CRUST_PROVIDER,
      providerEndpoint,
    };
    return await this.callService(data);
  }

  //#endregion

  public async getBlacklist() {
    const data = {
      eventName: StorageEventType.GET_BLACKLIST,
    };
    return await this.callService(data);
  }

  public async blacklistProject(project_uuid) {
    const data = {
      eventName: StorageEventType.BLACKLIST_PROJECT,
      project_uuid,
    };
    return await this.callService(data);
  }

  public async generateShortUrl(payload: ShortUrlDto) {
    const data = {
      eventName: StorageEventType.GENERATE_SHORT_URL,
      ...payload,
    };
    return await this.callService(data);
  }

  public async getTargetUrl(shortUrl_id: string) {
    const data = {
      eventName: StorageEventType.GET_TARGET_URL,
      shortUrl_id,
    };
    return await this.callService(data);
  }

  public async getIpnsByName(ipnsName: string) {
    const data = {
      eventName: StorageEventType.IPNS_GET_BY_NAME,
      ipnsName,
    };
    return await this.callService(data);
  }

  public async triggerGithubDeploy(payload: {
    url: string;
    websiteUuid: string;
    buildCommand: string | null;
    installCommand: string | null;
    buildDirectory: string;
    apiKey: string;
    apiSecret: string;
    configId: number;
  }) {
    const data = {
      eventName: StorageEventType.TRIGGER_GITHUB_DEPLOY,
      ...payload,
    };
    return await this.callService(data);
  }

  public async getDeployConfigByRepoId(repoId: number) {
    const data = {
      eventName: StorageEventType.GET_DEPLOY_CONFIG_BY_REPO_ID,
      repoId,
    };

    return await this.callService(data);
  }

  public async createDeploymentConfig(params: CreateDeploymentConfigDto) {
    const data = {
      eventName: StorageEventType.CREATE_DEPLOY_CONFIG,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async updateDeploymentConfig(
    id: number,
    params: UpdateDeploymentConfigDto,
  ) {
    const data = {
      eventName: StorageEventType.UPDATE_DEPLOY_CONFIG,
      id,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async linkGithub(params: GithubLinkDto) {
    const data = {
      eventName: StorageEventType.LINK_GITHUB,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async unlinkGithub(params: GithubUnlinkDto) {
    const data = {
      eventName: StorageEventType.UNLINK_GITHUB,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async listRepos(project_uuid: string) {
    const data = {
      eventName: StorageEventType.LIST_REPOS,
      project_uuid,
    };
    return await this.callService(data);
  }

  public async getProjectConfig(project_uuid: string) {
    const data = {
      eventName: StorageEventType.GET_PROJECT_GITHUB_CONFIG,
      project_uuid,
    };
    return await this.callService(data);
  }

  public async listDeploymentBuilds(filter: DeploymentBuildQueryFilter) {
    const data = {
      eventName: StorageEventType.LIST_DEPLOYMENT_BUILDS,
      filter: filter.serialize(),
    };
    return await this.callService(data);
  }

  public async deleteDeploymentConfig(websiteUuid: string) {
    const data = {
      eventName: StorageEventType.DELETE_DEPLOYMENT_CONFIG,
      websiteUuid,
    };
    return await this.callService(data);
  }

  public async setEnvironmentVariables(params: SetEnvironmentVariablesDto) {
    const data = {
      eventName: StorageEventType.SET_ENVIRONMENT_VARIABLES,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async getEnvironmentVariables(deploymentConfigId: number) {
    const data = {
      eventName: StorageEventType.GET_ENVIRONMENT_VARIABLES,
      deploymentConfigId,
    };
    return await this.callService(data);
  }

  public async triggerWebDeploy(
    params: NftWebsiteDeployDto | WebsiteDeployDto,
  ) {
    const data = {
      eventName: StorageEventType.TRIGGER_WEB_DEPLOY,
      body: params.serialize(),
    };
    return await this.callService(data);
  }
}
