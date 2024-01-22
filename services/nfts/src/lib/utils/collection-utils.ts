import {
  BlockchainMicroservice,
  CreateEvmTransactionDto,
  LogType,
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
import { NftsCodeException } from '../exceptions';
import { ContractVersion } from '../../modules/nfts/models/contractVersion.model';
import * as path from 'path';
import * as fs from 'fs';

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

  //Update collection status
  collection.collectionStatus = CollectionStatus.DEPLOYING;
  collection.contractAddress = response.data.data;
  collection.deployerAddress = response.data.address;
  collection.transactionHash = response.data.transactionHash;
  await collection.update(SerializeFor.UPDATE_DB, conn);
}

/**
 * Returns smart contract ABI or bytecode based on NFT collection type
 * @param collectionType NFTCollectionType
 * @param artifactType - Indicates whether to get contract ABI or bytecode
 */
export async function getNftContractArtifact(
  context: ServiceContext,
  collectionType: NFTCollectionType,
  artifactType: 'abi' | 'bytecode' = 'abi',
) {
  try {
    const latestTypeVersion = await new ContractVersion(
      {},
      context,
    ).getDefaultVersion(collectionType);

    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const artifact = fs.readFileSync(
      path.join(
        __dirname,
        `../contracts/${artifactType}/${NFTCollectionType[
          collectionType
        ].toLowerCase()}`,
        `/v${latestTypeVersion}.${artifactType === 'abi' ? 'json' : 'txt'}`,
      ),
      'utf8',
    );
    if (!artifact) {
      throw new Error(`Invalid ${artifactType} read`);
    }
    return artifact;
  } catch (err) {
    throw await new NftsCodeException({
      status: 500,
      errorMessage: `Error getting NFT contract ${artifactType} for type ${collectionType}: ${err}`,
      code: NftsErrorCode.GENERAL_SERVER_ERROR,
    }).writeToMonitor({
      context,
      logType: LogType.ERROR,
      data: { err, collectionType },
    });
  }
}
