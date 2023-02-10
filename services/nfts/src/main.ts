import { NftsEventType } from '@apillon/lib';
import type { Context } from 'aws-lambda/handler';
import { NftsService } from './modules/nfts/nfts.service';

export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [NftsEventType.HELLO]: NftsService.getHello,
    [NftsEventType.DEPLOY_NFT]: NftsService.deployNftContract,
    [NftsEventType.TRANSFER_OWNERSHIP]: NftsService.transferNftOwnership,
    [NftsEventType.MINT_NFT]: NftsService.mintNftTo,
    [NftsEventType.SET_BASE_URI]: NftsService.setNftCollectionBaseUri,
  };

  return await processors[event.eventName](event, context);
}
