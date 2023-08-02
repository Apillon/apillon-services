import {
  BlockchainMicroservice,
  CreateEvmTransactionDto,
  NFTCollectionType,
  PoolConnection,
  SerializeFor,
  TransactionStatus,
} from '@apillon/lib';
import {
  CollectionStatus,
  DbTables,
  NftsErrorCode,
  TransactionType,
} from '../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import { Collection } from '../../modules/nfts/models/collection.model';
import { Transaction } from '../../modules/transaction/models/transaction.model';
import { TransactionService } from '../../modules/transaction/transaction.service';
import { WalletService } from '../../modules/wallet/wallet.service';
import { ethers, UnsignedTransaction } from 'ethers';
import {
  EvmNftABI,
  EvmNftBytecode,
  EvmNftNestableABI,
  EvmNftNestableBytecode,
} from '../contracts/deployed-nft-contract';
import { NftsCodeException } from '../exceptions';

export async function deployNFTCollectionContract(
  context: ServiceContext,
  collection: Collection,
  conn: PoolConnection,
) {
  const walletService = new WalletService(context, collection.chain);
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

  dbTxRecord.populate({
    chainId: collection.chain,
    transactionType: TransactionType.DEPLOY_CONTRACT,
    refTable: DbTables.COLLECTION,
    refId: collection.id,
    transactionHash: response.data.transactionHash,
    transactionStatus: TransactionStatus.PENDING,
  });

  //Insert to DB
  await TransactionService.saveTransaction(context, dbTxRecord, conn);
  //Update collection status
  collection.collectionStatus = CollectionStatus.DEPLOYING;
  collection.contractAddress = response.data.data;
  collection.deployerAddress = response.data.address;
  await collection.update(SerializeFor.UPDATE_DB, conn);
}

/**
 * Returns smart contract ABI based on NFT collection type
 * @param collectionType NFTCollectionType
 */
export function getNftContractAbi(collectionType: NFTCollectionType) {
  switch (collectionType) {
    case NFTCollectionType.GENERIC:
      return EvmNftABI;
    case NFTCollectionType.NESTABLE:
      return EvmNftNestableABI;
    default:
      throw new NftsCodeException({
        status: 500,
        code: NftsErrorCode.GENERAL_SERVER_ERROR,
      });
  }
}

/**
 * Returns smart contract bytecode based on NFT collection type
 * @param collectionType NFTCollectionType
 */
export function getNftContractBytecode(collectionType: NFTCollectionType) {
  switch (collectionType) {
    case NFTCollectionType.GENERIC:
      return EvmNftBytecode;
    case NFTCollectionType.NESTABLE:
      return EvmNftNestableBytecode;
    default:
      throw new NftsCodeException({
        status: 500,
        code: NftsErrorCode.GENERAL_SERVER_ERROR,
      });
  }
}
