import { StorageEventType } from '@apillon/lib';
import type { Context } from 'aws-lambda/handler';
import { BucketService } from './modules/bucket/bucket.service';
import { DirectoryService } from './modules/directory/directory.service';
import { HostingService } from './modules/hosting/hosting.service';
import { IpnsService } from './modules/ipns/ipns.service';
import { StorageService } from './modules/storage/storage.service';

export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [StorageEventType.REQUEST_S3_SIGNED_URL_FOR_UPLOAD]:
      StorageService.generateS3SignedUrlForUpload,
    [StorageEventType.END_FILE_UPLOAD_SESSION]:
      StorageService.endFileUploadSession,
    [StorageEventType.END_FILE_UPLOAD]: StorageService.endFileUpload,
    [StorageEventType.LIST_FILE_UPLOAD]: StorageService.listFileUploads,

    [StorageEventType.LIST_BUCKETS]: BucketService.listBuckets,
    [StorageEventType.GET_BUCKET]: BucketService.getBucket,
    [StorageEventType.CREATE_BUCKET]: BucketService.createBucket,
    [StorageEventType.UPDATE_BUCKET]: BucketService.updateBucket,
    [StorageEventType.DELETE_BUCKET]: BucketService.markBucketForDeletion,
    [StorageEventType.CANCEL_DELETE_BUCKET]:
      BucketService.unmarkBucketForDeletion,
    [StorageEventType.MAX_BUCKETS_QUOTA_REACHED]:
      BucketService.maxBucketsQuotaReached,
    [StorageEventType.BUCKET_CLEAR_CONTENT]: BucketService.clearBucketContent,

    [StorageEventType.CREATE_DIRECTORY]: DirectoryService.createDirectory,
    [StorageEventType.UPDATE_DIRECTROY]: DirectoryService.updateDirectory,
    [StorageEventType.DELETE_DIRECTORY]: DirectoryService.deleteDirectory,
    [StorageEventType.CANCEL_DELETE_DIRECTORY]:
      DirectoryService.unmarkDirectoryForDeletion,
    [StorageEventType.LIST_DIRECTORY_CONTENT]:
      DirectoryService.listDirectoryContent,
    [StorageEventType.GET_FILE_DETAILS]: StorageService.getFileDetails,
    [StorageEventType.FILE_DELETE]: StorageService.deleteFile,
    [StorageEventType.CANCEL_FILE_DELETE]: StorageService.unmarkFileForDeletion,
    [StorageEventType.LIST_FILES_MARKED_FOR_DELETION]:
      StorageService.listFilesMarkedForDeletion,

    [StorageEventType.BUCKET_WEBHOOK_GET]: BucketService.getBucketWebhook,
    [StorageEventType.BUCKET_WEBHOOK_CREATE]: BucketService.createBucketWebhook,
    [StorageEventType.BUCKET_WEBHOOK_UPDATE]: BucketService.updateBucketWebhook,
    [StorageEventType.BUCKET_WEBHOOK_DELETE]: BucketService.deleteBucketWebhook,

    [StorageEventType.IPNS_LIST]: IpnsService.listIpns,
    [StorageEventType.IPNS_CREATE]: IpnsService.createIpns,
    [StorageEventType.IPNS_UPDATE]: IpnsService.updateIpns,
    [StorageEventType.IPNS_DELETE]: IpnsService.deleteIpns,
    [StorageEventType.IPNS_PUBLISH]: IpnsService.publishIpns,

    [StorageEventType.WEB_PAGE_LIST]: HostingService.listWebPages,
    [StorageEventType.WEB_PAGE_GET]: HostingService.getWebPage,
    [StorageEventType.WEB_PAGE_CREATE]: HostingService.createWebPage,
    [StorageEventType.WEB_PAGE_UPDATE]: HostingService.updateWebPage,
    [StorageEventType.WEB_PAGE_DEPLOY]: HostingService.deployWebPage,
    [StorageEventType.WEB_PAGE_LIST_DOMAINS]: HostingService.listDomains,
    [StorageEventType.WEB_PAGE_QUOTA_REACHED]:
      HostingService.maxWebPagesQuotaReached,

    [StorageEventType.DEPLOYMENT_GET]: HostingService.getDeployment,
    [StorageEventType.DEPLOYMENT_LIST]: HostingService.listDeployments,
  };

  return await processors[event.eventName](event, context);
}
