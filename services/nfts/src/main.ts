import { NftsEventType } from '@apillon/lib';
import type { Context } from 'aws-lambda/handler';
import { NftsService } from './modules/nfts/nfts.service';
import { TransactionService } from './modules/transaction/transaction.service';

/**
 * Processing lambda event with appropriate service function based on event name
 * @param event lambda event
 * @param context lambda context
 * @returns service response
 */
export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [NftsEventType.CREATE_COLLECTION]: NftsService.createCollection,
    [NftsEventType.NFT_COLLECTIONS_LIST]: NftsService.listNftCollections,
    [NftsEventType.TRANSFER_OWNERSHIP]: NftsService.transferCollectionOwnership,
    [NftsEventType.MINT_NFT]: NftsService.mintNftTo,
    [NftsEventType.BURN_NFT]: NftsService.burnNftToken,
    [NftsEventType.SET_BASE_URI]: NftsService.setNftCollectionBaseUri,
    [NftsEventType.CHECK_TRANSACTION_STATUS]:
      TransactionService.checkTransactionsStatus,
    [NftsEventType.NFT_COLLECTION_TRANSACTION_LIST]:
      TransactionService.listCollectionTransactions,
    [NftsEventType.GET_NFT_COLLECTION]: NftsService.getCollection,
    [NftsEventType.DEPLOY_COLLECTION]: NftsService.deployCollection,
  };

  return await processors[event.eventName](event, context);
}
