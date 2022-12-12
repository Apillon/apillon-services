import { StorageEventType } from '@apillon/lib';
import { Context } from 'aws-lambda/handler';
import { BucketService } from './modules/bucket/bucket.service';
import { CrustService } from './modules/crust/crust.service';
import { DirectoryService } from './modules/directory/directory.service';
import { IPFSService } from './modules/ipfs/ipfs.service';
import { StorageService } from './modules/storage/storage.service';

export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [StorageEventType.ADD_FILE_TO_IPFS]: IPFSService.uploadFilesToIPFS,
    [StorageEventType.GET_OBJECT_FROM_IPFS]: IPFSService.getFileFromIPFS,
    [StorageEventType.LIST_IPFS_DIRECTORY]: IPFSService.listIPFSDirectory,
    [StorageEventType.ADD_FILE_TO_IPFS_FROM_S3]:
      IPFSService.uploadFileToIPFSFromS3,
    [StorageEventType.PLACE_STORAGE_ORDER_TO_CRUST]:
      CrustService.placeStorageOrderToCRUST,
    [StorageEventType.REQUEST_S3_SIGNED_URL_FOR_UPLOAD]:
      StorageService.generateS3SignedUrlForUpload,
    [StorageEventType.END_FILE_UPLOAD_SESSION]:
      StorageService.endFileUploadSession,
    [StorageEventType.END_FILE_UPLOAD]: StorageService.endFileUpload,

    [StorageEventType.CREATE_BUCKET]: BucketService.createBucket,
    [StorageEventType.UPDATE_BUCKET]: BucketService.updateBucket,
    [StorageEventType.DELETE_BUCKET]: BucketService.deleteBucket,

    [StorageEventType.LIST_BUCKETS]: BucketService.listBuckets,
    [StorageEventType.CREATE_DIRECTORY]: DirectoryService.createDirectory,
    [StorageEventType.UPDATE_DIRECTROY]: DirectoryService.updateDirectory,
    [StorageEventType.DELETE_DIRECTORY]: DirectoryService.deleteDirectory,
    [StorageEventType.LIST_DIRECTORY_CONTENT]:
      DirectoryService.listDirectoryContent,
    [StorageEventType.GET_FILE_DETAILS]: StorageService.getFileDetails,
    [StorageEventType.FILE_DELETE]: StorageService.deleteFile,

    [StorageEventType.BUCKET_WEBHOOK_GET]: BucketService.getBucketWebhook,
    [StorageEventType.BUCKET_WEBHOOK_CREATE]: BucketService.createBucketWebhook,
    [StorageEventType.BUCKET_WEBHOOK_UPDATE]: BucketService.updateBucketWebhook,
    [StorageEventType.BUCKET_WEBHOOK_DELETE]: BucketService.deleteBucketWebhook,
  };

  return await processors[event.eventName](event, context);
}
