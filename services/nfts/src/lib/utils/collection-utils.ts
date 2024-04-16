import {
  BlockchainMicroservice,
  ChainType,
  Context,
  CreateEvmTransactionDto,
  CreateSubstrateTransactionDto,
  EvmChain,
  PoolConnection,
  SerializeFor,
  SUBSTRATE_NFTS_MAX_SUPPLY,
  SubstrateChain,
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
import { ethers } from 'ethers';
import { ContractVersion } from '../../modules/nfts/models/contractVersion.model';
import { BN_MAX_INTEGER } from '@polkadot/util/bn/consts';
import { SubstrateContractClient } from '../../modules/clients/substrate-contract.client';

export async function getSubstrateContractClient(
  context: Context,
  chain: SubstrateChain,
  contractAbi: { [key: string]: any },
  contractAddress?: string,
) {
  const rpcEndpoint = (
    await new BlockchainMicroservice(context).getChainEndpoint(
      chain,
      ChainType.SUBSTRATE,
    )
  ).data.url;
  // return new SubstrateContractClient(rpcEndpoint);
  return await SubstrateContractClient.getInstance(
    rpcEndpoint,
    contractAbi,
    contractAddress,
  );
}

export async function deployNFTCollectionContract(
  context: ServiceContext,
  collection: Collection,
  conn: PoolConnection,
) {
  const { abi, bytecode } = await new ContractVersion(
    {},
    context,
  ).getContractVersion(collection.collectionType, collection.chainType);
  // TODO: we should use NftsService.sendTransaction() here since code is the same but weoker call makes it difficult
  let response;
  switch (collection.chainType) {
    case ChainType.EVM: {
      const evmWalletService = new WalletService(
        context,
        collection.chain as EvmChain,
      );
      const tx = await evmWalletService.createDeployTransaction(
        collection,
        abi,
        bytecode,
      );
      response = await new BlockchainMicroservice(context).createEvmTransaction(
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
      break;
    }
    case ChainType.SUBSTRATE: {
      const substrateContractClient = await getSubstrateContractClient(
        context,
        collection.chain as SubstrateChain,
        JSON.parse(abi),
      );
      console.log(
        `[${
          SubstrateChain[collection.chain]
        }] Creating NFT deploy contract transaction from wallet address: ${
          collection.deployerAddress
        }, parameters=${JSON.stringify(collection)}`,
      );

      const maxSupply =
        collection.maxSupply === 0
          ? SUBSTRATE_NFTS_MAX_SUPPLY
          : collection.maxSupply;
      const dropPrice = collection.drop
        ? collection.dropPrice
        : BN_MAX_INTEGER.toNumber();
      const tx = await substrateContractClient.createDeployTransaction([
        [collection.name],
        [collection.symbol],
        collection.baseUri,
        collection.baseExtension,
        maxSupply,
        dropPrice, // prepresale_price_per_mint
        dropPrice, //presale_price_per_mint
        dropPrice, //price_per_mint
        0, //prepresale_start_at
        0, //presale_start_at
        collection.drop ? collection.dropStart : 0, //public_sale_start_at
        collection.drop ? BN_MAX_INTEGER.toNumber() : 0, //public_sale_end_at
        0, //launchpad_fee
        collection.royaltiesAddress, //project_treasury
        collection.royaltiesAddress, //launchpad_treasury
      ]);
      response = await new BlockchainMicroservice(
        context,
      ).createSubstrateTransaction(
        new CreateSubstrateTransactionDto(
          {
            chain: collection.chain,
            transaction: tx.toHex(),
            referenceTable: DbTables.COLLECTION,
            referenceId: collection.id,
            project_uuid: collection.project_uuid,
          },
          context,
        ),
      );
      break;
    }
    default:
      throw new Error(
        `Support for chain type ${collection.chainType} not implemented`,
      );
  }
  // Create transaction request to be sent on blockchain

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
    collection.chainType,
  );
  collection.contractVersion_id = id;

  await collection.update(SerializeFor.UPDATE_DB, conn);
}
