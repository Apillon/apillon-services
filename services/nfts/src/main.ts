import { NftsEventType } from '@apillon/lib';
import type { Context } from 'aws-lambda/handler';
import { NftsService } from './modules/nfts/nfts.service';

export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [NftsEventType.HELLO]: NftsService.getHello,
  };

  return await processors[event.eventName](event, context);
}
