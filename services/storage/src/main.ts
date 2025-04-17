import { StorageEventType } from '@apillon/lib';
import type { Context } from 'aws-lambda/handler';
import { BucketService } from './modules/bucket/bucket.service';
import { DirectoryService } from './modules/directory/directory.service';
import { HostingService } from './modules/hosting/hosting.service';
import { IpnsService } from './modules/ipns/ipns.service';
import { NftStorageService } from './modules/nfts/nft-storage.service';
import { StorageService } from './modules/storage/storage.service';
import { CrustService } from './modules/crust/crust.service';
import { UrlShortenerService } from './modules/url-shortener/url-shortener.service';

/**
 * Processing lambda event with appropriate service function based on event name
 * @param event lambda event
 * @param context lambda context
 * @returns service response
 */
export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [StorageEventType.REQUEST_S3_SIGNED_URLS_FOR_UPLOAD]:
      StorageService.generateMultipleS3UrlsForUpload,
    [StorageEventType.END_FILE_UPLOAD_SESSION]:
      StorageService.endFileUploadSession,
    [StorageEventType.END_FILE_UPLOAD]: StorageService.endFileUpload,
    [StorageEventType.LIST_FILE_UPLOAD]: StorageService.listFileUploads,
    [StorageEventType.LIST_FILE_UPLOAD_SESSIONS]:
      StorageService.listFileUploadSessions,

    [StorageEventType.LIST_BUCKETS]: BucketService.listBuckets,
    [StorageEventType.GET_BUCKET]: BucketService.getBucket,
    [StorageEventType.CREATE_BUCKET]: BucketService.createBucket,
    [StorageEventType.UPDATE_BUCKET]: BucketService.updateBucket,
    [StorageEventType.DELETE_BUCKET]: BucketService.deleteBucket,
    [StorageEventType.MAX_BUCKETS_QUOTA_REACHED]:
      BucketService.maxBucketsQuotaReached,
    [StorageEventType.BUCKET_CLEAR_CONTENT]: BucketService.clearBucketContent,

    [StorageEventType.CREATE_DIRECTORY]: DirectoryService.createDirectory,
    [StorageEventType.UPDATE_DIRECTROY]: DirectoryService.updateDirectory,
    [StorageEventType.DELETE_DIRECTORY]: DirectoryService.deleteDirectory,
    [StorageEventType.LIST_DIRECTORY_CONTENT]:
      DirectoryService.listDirectoryContent,
    [StorageEventType.GET_FILE_DETAILS]: StorageService.getFileDetails,
    [StorageEventType.FILE_DELETE]: StorageService.deleteFile,
    [StorageEventType.RESTORE_FILE]: StorageService.restoreFile,
    [StorageEventType.LIST_FILES]: StorageService.listFiles,

    [StorageEventType.BUCKET_WEBHOOK_GET]: BucketService.getBucketWebhook,
    [StorageEventType.BUCKET_WEBHOOK_CREATE]: BucketService.createBucketWebhook,
    [StorageEventType.BUCKET_WEBHOOK_UPDATE]: BucketService.updateBucketWebhook,
    [StorageEventType.BUCKET_WEBHOOK_DELETE]: BucketService.deleteBucketWebhook,

    [StorageEventType.IPNS_LIST]: IpnsService.listIpns,
    [StorageEventType.IPNS_CREATE]: IpnsService.createIpns,
    [StorageEventType.IPNS_UPDATE]: IpnsService.updateIpns,
    [StorageEventType.IPNS_DELETE]: IpnsService.deleteIpns,
    [StorageEventType.IPNS_PUBLISH]: IpnsService.publishIpns,
    [StorageEventType.IPNS_GET]: IpnsService.getIpns,
    [StorageEventType.IPNS_GET_BY_NAME]: IpnsService.getIpnsByName,

    [StorageEventType.WEBSITE_LIST]: HostingService.listWebsites,
    [StorageEventType.WEBSITE_GET]: HostingService.getWebsite,
    [StorageEventType.WEBSITE_GET_WITH_ACCESS]:
      HostingService.getWebsiteWithAccess,
    [StorageEventType.WEBSITE_CREATE]: HostingService.createWebsite,
    [StorageEventType.WEBSITE_UPDATE]: HostingService.updateWebsite,
    [StorageEventType.WEBSITE_DEPLOY]: HostingService.deployWebsite,
    [StorageEventType.WEBSITE_ARCHIVE]: HostingService.archiveWebsite,
    [StorageEventType.WEBSITE_DELETE]: HostingService.deleteWebsite,
    [StorageEventType.WEBSITE_ACTIVATE]: HostingService.activateWebsite,
    [StorageEventType.WEBSITE_LIST_DOMAINS]: HostingService.listDomains,
    [StorageEventType.WEBSITE_GET_ALL_DOMAINS]: HostingService.getDomains,
    [StorageEventType.WEBSITE_QUOTA_REACHED]:
      HostingService.maxWebsitesQuotaReached,
    [StorageEventType.REQUEST_S3_SIGNED_URLS_FOR_WEBSITE_UPLOAD]:
      HostingService.generateMultipleS3UrlsForUpload,
    [StorageEventType.WEBSITE_CHECK_DOMAIN_DNS]:
      HostingService.checkWebsiteDomainDns,
    [StorageEventType.WEBSITE_REMOVE_DOMAIN]:
      HostingService.removeWebsiteDomain,

    [StorageEventType.DEPLOYMENT_GET]: HostingService.getDeployment,
    [StorageEventType.DEPLOYMENT_LIST]: HostingService.listDeployments,
    [StorageEventType.DEPLOYMENT_APPROVE]: HostingService.approveDeployment,
    [StorageEventType.DEPLOYMENT_REJECT]: HostingService.rejectDeployment,

    [StorageEventType.PREPARE_COLLECTION_BASE_URI]:
      NftStorageService.prepareBaseUriForCollection,
    [StorageEventType.COLLECTION_METADATA_LIST]:
      NftStorageService.listCollectionMetadata,

    [StorageEventType.TEST_CRUST_PROVIDER]: CrustService.testCrustProvider,

    [StorageEventType.PROJECT_STORAGE_DETAILS]:
      StorageService.getProjectStorageDetails,
    [StorageEventType.BLACKLIST_PROJECT]: StorageService.blacklistProjectData,

    [StorageEventType.GET_BLACKLIST]: StorageService.getBlacklist,
    [StorageEventType.STORAGE_INFO]: StorageService.getStorageInfo,
    [StorageEventType.PROJECTS_OVER_BANDWIDTH_QUOTA]:
      StorageService.getProjectsOverBandwidthQuota,

    [StorageEventType.GET_PROJECT_IPFS_CLUSTER]: StorageService.getIpfsCluster,
    [StorageEventType.GET_IPFS_CLUSTER_INFO]: StorageService.getIpfsClusterInfo,
    [StorageEventType.GET_LINK]: StorageService.getLink,
    [StorageEventType.GET_LINKS]: StorageService.getLinks,
    [StorageEventType.UNLINK_GITHUB_FROM_WEBSITES]:
      StorageService.unlinkGithubFromWebsites,

    [StorageEventType.GENERATE_SHORT_URL]: UrlShortenerService.generateShortUrl,
    [StorageEventType.GET_TARGET_URL]: UrlShortenerService.getTargetUrl,
  };

  return await processors[event.eventName](event, context);
}
