import {
  BlockchainMicroservice,
  CreateEvmTransactionDto,
  PoolConnection,
  SerializeFor,
} from '@apillon/lib';
import { CollectionStatus, DbTables } from '../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import { Collection } from '../../modules/nfts/models/collection.model';
import { Transaction } from '../../modules/transaction/models/transaction.model';
import { TransactionService } from '../../modules/transaction/transaction.service';
import { WalletService } from '../../modules/wallet/wallet.service';
import { UnsignedTransaction, ethers } from 'ethers';

export async function deployNFTCollectionContract(
  context: ServiceContext,
  collection: Collection,
  conn: PoolConnection,
) {
  const walletService = new WalletService(collection.chain);
  //Prepare transaction record
  const dbTxRecord: Transaction = new Transaction({}, context);

  // Create transaction request to be sent on blockchain
  const tx: UnsignedTransaction = await walletService.createDeployTransaction(
    collection,
  );

  const blockchainServiceRequest: CreateEvmTransactionDto =
    new CreateEvmTransactionDto(
      {
        chain: collection.chain,
        transaction: ethers.utils.serializeTransaction(tx),
        referenceTable: DbTables.COLLECTION,
        referenceId: collection.id,
      },
      context,
    );
  const response = await new BlockchainMicroservice(
    context,
  ).createEvmTransaction(blockchainServiceRequest);

  dbTxRecord.transactionHash = response.transactionHash;
  //Insert to DB
  await TransactionService.saveTransaction(context, dbTxRecord, conn);
  //Update collection status
  collection.collectionStatus = CollectionStatus.DEPLOYING;
  collection.deployerAddress = response.data;
  await collection.update(SerializeFor.UPDATE_DB, conn);
}
