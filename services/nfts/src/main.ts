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
    [NftsEventType.CREATE_UNIQUE_COLLECTION]:
      NftsService.createUniqueCollection,
    [NftsEventType.NFT_COLLECTIONS_LIST]: NftsService.listNftCollections,
    [NftsEventType.TRANSFER_OWNERSHIP]: NftsService.transferCollectionOwnership,
    [NftsEventType.MINT_NFT]: NftsService.mintNftTo,
    [NftsEventType.NEST_MINT_NFT]: NftsService.nestMintNftTo,
    [NftsEventType.BURN_NFT]: NftsService.burnNftToken,
    [NftsEventType.SET_BASE_URI]: NftsService.setNftCollectionBaseUri,
    [NftsEventType.MAX_COLLECTIONS_QUOTA_REACHED]:
      NftsService.maxCollectionsQuotaReached,
    [NftsEventType.CHECK_TRANSACTION_STATUS]:
      TransactionService.checkTransactionsStatus,
    [NftsEventType.NFT_COLLECTION_TRANSACTION_LIST]:
      TransactionService.listCollectionTransactions,
    [NftsEventType.GET_NFT_COLLECTION]: NftsService.getCollection,
    [NftsEventType.GET_NFT_COLLECTION_BY_UUID]: NftsService.getCollectionByUuid,
    [NftsEventType.DEPLOY_COLLECTION]: NftsService.deployCollection,
    [NftsEventType.EXECUTE_DEPLOY_COLLECTION_WORKER]:
      NftsService.executeDeployCollectionWorker,
    [NftsEventType.PROJECT_COLLECTION_DETAILS]:
      NftsService.getProjectCollectionDetails,
    [NftsEventType.ADD_NFTS_METADATA]: NftsService.addNftsMetadata,
    [NftsEventType.ARCHIVE_COLLECTION]: NftsService.archiveCollection,
    [NftsEventType.ADD_IPNS_TO_COLLECTION]: NftsService.addIpnsToCollection,
    [NftsEventType.ACTIVATE_COLLECTION]: NftsService.activateCollection,
    [NftsEventType.SET_WEBSITE_UUID]: NftsService.setWebsiteUuid,
  };

  return await processors[event.eventName](event, context);
}
