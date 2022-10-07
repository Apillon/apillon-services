import { StorageEventType } from 'at-lib';
import { Context } from 'aws-lambda/handler';
import { TestService } from './modules/user.service';

export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [StorageEventType.ADD_FILE_TO_IPFS]: TestService.test,
  };

  return await processors[event.eventName](event, context);
}
