import { PoolConnection, SerializeFor } from '@apillon/lib';
import { TransactionRequest } from '@ethersproject/providers';
import {
  Chains,
  CollectionStatus,
  DbTables,
  TransactionStatus,
  TransactionType,
} from '../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import { Collection } from '../../modules/nfts/models/collection.model';
import { Transaction } from '../../modules/transaction/models/transaction.model';
import { TransactionService } from '../../modules/transaction/transaction.service';
import { WalletService } from '../../modules/wallet/wallet.service';

export async function deployNFTCollectionContract(
  context: ServiceContext,
  collection: Collection,
  conn: PoolConnection,
) {
  const walletService = new WalletService();
  //Prepare transaction record
  const dbTxRecord: Transaction = new Transaction({}, context);
  await dbTxRecord.populateNonce(conn);
  if (!dbTxRecord.nonce) {
    //First transaction record - nonce should be acquired from chain
    dbTxRecord.nonce = await walletService.getCurrentMaxNonce();
  }

  // Create transaction request to be sent on blockchain
  const txRequest: TransactionRequest =
    await walletService.createDeployTransaction(collection, dbTxRecord.nonce);
  const rawTransaction = await walletService.signTransaction(txRequest);
  const txResponse = await walletService.sendTransaction(rawTransaction);
  //Populate DB transaction record with properties
  dbTxRecord.populate({
    chainId: Chains.MOONBASE,
    transactionType: TransactionType.DEPLOY_CONTRACT,
    rawTransaction: rawTransaction,
    refTable: DbTables.COLLECTION,
    refId: collection.id,
    transactionHash: txResponse.hash,
    transactionStatus: TransactionStatus.PENDING,
  });
  //Insert to DB
  await TransactionService.saveTransaction(context, dbTxRecord, conn);
  //Update collection status
  collection.collectionStatus = CollectionStatus.DEPLOYING;
  await collection.update(SerializeFor.UPDATE_DB, conn);
}
