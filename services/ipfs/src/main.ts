import { StorageEventType } from 'at-lib';
import { Context } from 'aws-lambda/handler';
import { IPFSService } from './modules/ipfs.service';

export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [StorageEventType.ADD_FILE_TO_IPFS]: IPFSService.uploadFilesToIPFS,
  };

  return await processors[event.eventName](event, context);
}
