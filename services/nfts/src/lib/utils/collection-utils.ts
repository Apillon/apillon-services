import {
  BlockchainMicroservice,
  ChainType,
  Context,
  CreateEvmTransactionDto,
  CreateSubstrateTransactionDto,
  env,
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
  TransactionUtils,
} from '@apillon/blockchain-lib/evm';
import {
  SUBSTRATE_MAX_INT,
  SubstrateContractClient,
} from '@apillon/blockchain-lib/substrate';
import { UniqueNftClient } from '../../modules/nfts/clients/unique-nft-client';

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

  return new EVMContractClient(rpcEndpoint, contractAbi, contractAddress);
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
  const blockchainService = new BlockchainMicroservice(context);
  // TODO: we should use NftsService.sendTransaction() here since code is the same but weoker call makes it difficult
  let response: { data: TransactionDto };
  let contractVersion_id: number = null;
  let callArguments = [];
  switch (collection.chainType) {
    case ChainType.EVM: {
      const { id, abi, bytecode } = await new ContractVersion(
        {},
        context,
      ).getContractVersion(collection.collectionType, collection.chainType);
      contractVersion_id = id;
      const royaltiesFees = Math.round(collection.royaltiesFees * 100);
      const maxSupply =
        collection.maxSupply === 0 ? EVM_MAX_INT : collection.maxSupply;
      const royaltiesAddress =
        collection.royaltiesAddress ??
        '0x0000000000000000000000000000000000000000';

      callArguments = [
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
      let deployerAddress: string | null = null;
      switch (collection.collectionType) {
        case NFTCollectionType.GENERIC: {
          let adminAddress = collection.adminAddress;
          // if admin wallet is not set use one of our wallets
          if (!adminAddress) {
            const wallets = await blockchainService.getWallets(
              collection.chain,
              collection.chainType,
            );
            if (!wallets.success || wallets.data.length <= 0) {
              throw new NftsCodeException({
                status: 500,
                code: NftsErrorCode.GENERAL_SERVER_ERROR,
              });
            }
            const randomIndex = Math.floor(Math.random() * wallets.data.length);
            adminAddress = wallets.data[randomIndex].address;
            // we need to set deployer so that our wallet has admin access
            deployerAddress = adminAddress;
          }
          callArguments.push(
            [
              TransactionUtils.convertBaseToGwei(collection.dropPrice),
              collection.dropStart,
              maxSupply,
              collection.dropReserve,
              royaltiesFees,
            ],
            royaltiesAddress,
            adminAddress,
          );
          break;
        }
        case NFTCollectionType.NESTABLE: {
          callArguments.push(collection.dropStart, collection.dropReserve, {
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
        callArguments,
      );
      response = await blockchainService.createEvmTransaction(
        new CreateEvmTransactionDto(
          {
            chain: collection.chain,
            transaction: serializedTransaction,
            referenceTable: DbTables.COLLECTION,
            referenceId: collection.id,
            project_uuid: collection.project_uuid,
            ...(deployerAddress ? { fromAddress: deployerAddress } : {}),
          },
          context,
        ),
      );
      break;
    }
    case ChainType.SUBSTRATE: {
      let transactionHex: string;
      if (collection.chain === SubstrateChain.UNIQUE) {
        const client = new UniqueNftClient(env.UNIQUE_NETWORK_API_URL);
        callArguments = [
          collection.name,
          collection.symbol,
          collection.description ?? '', // unique requires an empty string instead of null
          // we can implement admins
          [],
          // unique suggested to avoid using AllowList since they will redesign it
          false, //collection.drop,
          collection.collectionType === NFTCollectionType.NESTABLE,
          collection.isRevokable,
          collection.isSoulbound,
          collection.maxSupply <= 0
            ? SUBSTRATE_NFTS_MAX_SUPPLY
            : collection.maxSupply,
        ];
        transactionHex = await client.createCollection(
          ...(callArguments as [
            string,
            string,
            string,
            string[],
            boolean,
            boolean,
            boolean,
            boolean,
            number,
          ]),
        );
      } else {
        const { id, abi } = await new ContractVersion(
          {},
          context,
        ).getContractVersion(collection.collectionType, collection.chainType);
        contractVersion_id = id;
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
        transactionHex = tx.toHex();
      }
      response = await blockchainService.createSubstrateTransaction(
        new CreateSubstrateTransactionDto(
          {
            chain: collection.chain,
            transaction: transactionHex,
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
        callMethod: 'constructor',
        callArguments,
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
