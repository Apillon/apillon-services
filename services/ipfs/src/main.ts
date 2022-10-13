import { StorageEventType } from 'at-lib';
import { Context } from 'aws-lambda/handler';
import { CrustService } from './modules/crust.service';
import { IPFSService } from './modules/ipfs.service';

export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [StorageEventType.ADD_FILE_TO_IPFS]: IPFSService.uploadFilesToIPFS,
    [StorageEventType.GET_OBJECT_FROM_IPFS]: IPFSService.getFileFromIPFS,
    [StorageEventType.LIST_IPFS_DIRECTORY]: IPFSService.listIPFSDirectory,
    [StorageEventType.ADD_FILE_TO_IPFS_FROM_S3]:
      IPFSService.uploadFilesToIPFSFromS3,
    [StorageEventType.PLACE_STORAGE_ORDER_TO_CRUST]:
      CrustService.placeStorageOrderToCRUST,
  };

  return await processors[event.eventName](event, context);
}
