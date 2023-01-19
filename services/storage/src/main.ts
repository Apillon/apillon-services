import { StorageEventType } from '@apillon/lib';
import type { Context } from 'aws-lambda/handler';
import { BucketService } from './modules/bucket/bucket.service';
import { DirectoryService } from './modules/directory/directory.service';
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

    [StorageEventType.CREATE_DIRECTORY]: DirectoryService.createDirectory,
    [StorageEventType.UPDATE_DIRECTROY]: DirectoryService.updateDirectory,
    [StorageEventType.DELETE_DIRECTORY]:
      DirectoryService.markDirectoryForDeletion,
    [StorageEventType.CANCEL_DELETE_DIRECTORY]:
      DirectoryService.unmarkDirectoryForDeletion,
    [StorageEventType.LIST_DIRECTORY_CONTENT]:
      DirectoryService.listDirectoryContent,
    [StorageEventType.GET_FILE_DETAILS]: StorageService.getFileDetails,
    [StorageEventType.FILE_DELETE]: StorageService.markFileForDeletion,
    [StorageEventType.CANCEL_FILE_DELETE]: StorageService.unmarkFileForDeletion,

    [StorageEventType.BUCKET_WEBHOOK_GET]: BucketService.getBucketWebhook,
    [StorageEventType.BUCKET_WEBHOOK_CREATE]: BucketService.createBucketWebhook,
    [StorageEventType.BUCKET_WEBHOOK_UPDATE]: BucketService.updateBucketWebhook,
    [StorageEventType.BUCKET_WEBHOOK_DELETE]: BucketService.deleteBucketWebhook,
  };

  return await processors[event.eventName](event, context);
}
