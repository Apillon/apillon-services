import {
  BlockchainMicroservice,
  ChainType,
  Context,
  CreateEvmTransactionDto,
  CreateSubstrateTransactionDto,
  EvmChain,
  NFTCollectionType,
  PoolConnection,
  SerializeFor,
  SUBSTRATE_NFTS_MAX_SUPPLY,
  SubstrateChain,
  TransactionDto,
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
import { ContractVersion } from '../../modules/nfts/models/contractVersion.model';
import { NftsCodeException } from '../exceptions';
import {
  EVM_MAX_INT,
  EVMContractClient,
  SUBSTRATE_MAX_INT,
  SubstrateContractClient,
  TransactionUtils,
} from '@apillon/blockchain-lib';

export async function getEvmContractClient(
  context: Context,
  chain: EvmChain,
  contractAbi: string,
  contractAddress?: string,
) {
  const rpcEndpoint = (
    await new BlockchainMicroservice(context).getChainEndpoint(
      chain,
      ChainType.EVM,
    )
  ).data?.url;

  return EVMContractClient.getInstance(
    rpcEndpoint,
    contractAbi,
    contractAddress,
  );
}

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
  ).data?.url;

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
  const {
    id: contractVersion_id,
    abi,
    bytecode,
  } = await new ContractVersion({}, context).getContractVersion(
    collection.collectionType,
    collection.chainType,
  );
  // TODO: we should use NftsService.sendTransaction() here since code is the same but weoker call makes it difficult
  let response: { data: TransactionDto };
  switch (collection.chainType) {
    case ChainType.EVM: {
      const royaltiesFees = Math.round(collection.royaltiesFees * 100);
      const maxSupply =
        collection.maxSupply === 0 ? EVM_MAX_INT : collection.maxSupply;
      const royaltiesAddress =
        collection.royaltiesAddress ??
        '0x0000000000000000000000000000000000000000';

      let contractArguments: any[] = [
        collection.name,
        collection.symbol,
        collection.baseUri,
        collection.baseExtension,
        [
          collection.drop,
          collection.isSoulbound,
          collection.isRevokable,
          collection.isAutoIncrement,
        ],
      ];
      switch (collection.collectionType) {
        case NFTCollectionType.GENERIC: {
          contractArguments.push(
            TransactionUtils.convertBaseToGwei(collection.dropPrice),
            collection.dropStart,
            maxSupply,
            collection.dropReserve,
            royaltiesAddress,
            royaltiesFees,
          );
          break;
        }
        case NFTCollectionType.NESTABLE: {
          contractArguments.push(collection.dropStart, collection.dropReserve, {
            royaltyRecipient: royaltiesAddress,
            royaltyPercentageBps: royaltiesFees,
            maxSupply,
            pricePerMint: TransactionUtils.convertBaseToGwei(
              collection.dropPrice,
            ),
          });
          break;
        }
        default:
          throw new NftsCodeException({
            status: 500,
            code: NftsErrorCode.GENERAL_SERVER_ERROR,
          });
      }
      const serializedTransaction = EVMContractClient.createDeployTransaction(
        abi,
        bytecode,
        contractArguments,
      );
      response = await new BlockchainMicroservice(context).createEvmTransaction(
        new CreateEvmTransactionDto(
          {
            chain: collection.chain,
            transaction: serializedTransaction,
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
        ? `${substrateContractClient.toChainInt(collection.dropPrice)}`
        : SUBSTRATE_MAX_INT.toString();
      // address is hardcoded since at this point/time we don't have deployer address
      const royaltiesAddress =
        collection.royaltiesAddress ??
        'aZT7hRB5TkBLC5ouScMuRfAV86poS5eBmvbYKYqJJXEoKhk';
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
        collection.drop ? SUBSTRATE_MAX_INT.toNumber() : 0, //public_sale_end_at
        0, //launchpad_fee
        royaltiesAddress, //project_treasury
        royaltiesAddress, //launchpad_treasury
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
  collection.contractVersion_id = contractVersion_id;

  await collection.update(SerializeFor.UPDATE_DB, conn);
}
