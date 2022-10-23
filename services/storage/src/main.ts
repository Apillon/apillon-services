import { StorageEventType } from 'at-lib';
import { Context } from 'aws-lambda/handler';
import { BucketService } from './modules/bucket/bucket.service';
import { CrustService } from './modules/crust.service';
import { DirectoryService } from './modules/directory/directory.service';
import { IPFSService } from './modules/ipfs.service';
import { StorageService } from './modules/storage.service';

export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [StorageEventType.ADD_FILE_TO_IPFS]: IPFSService.uploadFilesToIPFS,
    [StorageEventType.GET_OBJECT_FROM_IPFS]: IPFSService.getFileFromIPFS,
    [StorageEventType.LIST_IPFS_DIRECTORY]: IPFSService.listIPFSDirectory,
    [StorageEventType.ADD_FILE_TO_IPFS_FROM_S3]:
      IPFSService.uploadFilesToIPFSFromS3,
    [StorageEventType.PLACE_STORAGE_ORDER_TO_CRUST]:
      CrustService.placeStorageOrderToCRUST,
    [StorageEventType.REQUEST_S3_SIGNED_URL_FOR_UPLOAD]:
      StorageService.generateS3SignedUrlForUpload,
    [StorageEventType.CREATE_BUCKET]: BucketService.createBucket,
    [StorageEventType.UPDATE_BUCKET]: BucketService.updateBucket,
    [StorageEventType.DELETE_BUCKET]: BucketService.deleteBucket,
    [StorageEventType.LIST_BUCKETS]: BucketService.listBuckets,
    [StorageEventType.CREATE_DIRECTORY]: DirectoryService.createDirectory,
    [StorageEventType.UPDATE_DIRECTROY]: DirectoryService.updateDirectory,
    [StorageEventType.DELETE_DIRECTORY]: DirectoryService.deleteDirectory,
  };

  return await processors[event.eventName](event, context);
}
