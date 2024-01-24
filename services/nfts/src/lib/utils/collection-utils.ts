import {
  BlockchainMicroservice,
  CreateEvmTransactionDto,
  PoolConnection,
  SerializeFor,
  TransactionStatus,
} from '@apillon/lib';
import {
  CollectionStatus,
  DbTables,
  TransactionType,
} from '../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import { Collection } from '../../modules/nfts/models/collection.model';
import { Transaction } from '../../modules/transaction/models/transaction.model';
import { TransactionService } from '../../modules/transaction/transaction.service';
import { WalletService } from '../../modules/wallet/wallet.service';
import { ethers, UnsignedTransaction } from 'ethers';
import { ContractVersion } from '../../modules/nfts/models/contractVersion.model';

export async function deployNFTCollectionContract(
  context: ServiceContext,
  collection: Collection,
  conn: PoolConnection,
) {
  const walletService = new WalletService(context, collection.chain);

  // Create transaction request to be sent on blockchain
  const tx: UnsignedTransaction = await walletService.createDeployTransaction(
    context,
    collection,
  );

  const response = await new BlockchainMicroservice(
    context,
  ).createEvmTransaction(
    new CreateEvmTransactionDto(
      {
        chain: collection.chain,
        transaction: ethers.utils.serializeTransaction(tx),
        referenceTable: DbTables.COLLECTION,
        referenceId: collection.id,
        project_uuid: collection.project_uuid,
      },
      context,
    ),
  );

  //Insert to DB
  await TransactionService.saveTransaction(
    context,
    new Transaction(
      {
        chainId: collection.chain,
        transactionType: TransactionType.DEPLOY_CONTRACT,
        refTable: DbTables.COLLECTION,
        refId: collection.id,
        transactionHash: response.data.transactionHash,
        transactionStatus: TransactionStatus.PENDING,
      },
      context,
    ),
    conn,
  );

  // Update collection data
  collection.collectionStatus = CollectionStatus.DEPLOYING;
  collection.contractAddress = response.data.data;
  collection.deployerAddress = response.data.address;
  collection.transactionHash = response.data.transactionHash;
  const { id } = await new ContractVersion({}, context).getContractVersion(
    collection.collectionType,
  );
  collection.contractVersion_id = id;

  await collection.update(SerializeFor.UPDATE_DB, conn);
}
