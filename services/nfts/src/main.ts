import { NftsEventType } from '@apillon/lib';
import type { Context } from 'aws-lambda/handler';
import { NftsService } from './modules/nfts/nfts.service';
import { TransactionService } from './modules/transaction/transaction.service';

export async function processEvent(event, context: Context): Promise<any> {
  const processors = {
    [NftsEventType.DEPLOY_NFT]: NftsService.deployNftContract,
    [NftsEventType.NFT_COLLECTIONS_LIST]: NftsService.listNftCollections,
    [NftsEventType.TRANSFER_OWNERSHIP]: NftsService.transferCollectionOwnership,
    [NftsEventType.MINT_NFT]: NftsService.mintNftTo,
    [NftsEventType.SET_BASE_URI]: NftsService.setNftCollectionBaseUri,
    [NftsEventType.CHECK_TRANSACTION_STATUS]:
      TransactionService.checkTransactionsStatus,
    [NftsEventType.NFT_COLLECTION_TRANSACTION_LIST]:
      TransactionService.listCollectionTransactions,
    [NftsEventType.GET_NFT_COLLECTION]: NftsService.getCollection,
    [NftsEventType.PREPARE_COLLECTION_METADATA]:
      NftsService.prepareCollectionMetadata,
  };

  return await processors[event.eventName](event, context);
}
