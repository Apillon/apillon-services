import { ContractVersion } from './../nfts/models/contractVersion.model';
import {
  BlockchainMicroservice,
  ChainType,
  Context,
  EvmChain,
  MintNftDTO,
} from '@apillon/lib';
import { TransactionReceipt } from '@ethersproject/providers';
import { Contract, ethers, UnsignedTransaction } from 'ethers';
import { NftTransaction } from '../../lib/nft-contract-transaction';
import { Collection } from '../nfts/models/collection.model';
import { CollectionStatus } from '../../config/types';
import { ServiceContext } from '@apillon/service-lib';

export class WalletService {
  private readonly evmChain: EvmChain;
  private provider: ethers.providers.JsonRpcProvider;
  private context: Context;

  constructor(context: Context, chain: EvmChain) {
    this.context = context;
    this.evmChain = chain;
  }

  /**
   * Function to initialize RPC provider. BCS is called to get endpoint, which is then used to initialize Provider
   * NOTE: This function should be called before each function in this class
   */
  async initializeProvider() {
    if (!this.provider) {
      const rpcEndpoint = (
        await new BlockchainMicroservice(this.context).getChainEndpoint(
          this.evmChain,
          ChainType.EVM,
        )
      ).data.url;

      this.provider = new ethers.providers.JsonRpcProvider(rpcEndpoint);
      console.log(`RPC initialization ${rpcEndpoint}`);
    }
  }

  async createDeployTransaction(
    context: ServiceContext,
    params: Collection,
  ): Promise<UnsignedTransaction> {
    await this.initializeProvider();
    return await NftTransaction.createDeployContractTransaction(
      context,
      params,
    );
  }

  async createTransferOwnershipTransaction(
    context: ServiceContext,
    collection: Collection,
    newOwner: string,
  ): Promise<UnsignedTransaction> {
    await this.initializeProvider();
    return await NftTransaction.createTransferOwnershipTransaction(
      context,
      this.evmChain,
      collection,
      newOwner,
    );
  }

  async createSetNftBaseUriTransaction(
    context: ServiceContext,
    collection: Collection,
    uri: string,
  ): Promise<UnsignedTransaction> {
    await this.initializeProvider();
    return await NftTransaction.createSetNftBaseUriTransaction(
      context,
      this.evmChain,
      collection,
      uri,
    );
  }

  async createMintToTransaction(
    context: ServiceContext,
    collection: Collection,
    params: MintNftDTO,
  ): Promise<UnsignedTransaction> {
    await this.initializeProvider();
    return await NftTransaction.createMintToTransaction(
      context,
      this.evmChain,
      collection,
      params,
    );
  }

  async createNestMintToTransaction(
    context: ServiceContext,
    parentCollectionAddress: string,
    parentNftId: number,
    childCollection: Collection,
    quantity: number,
  ): Promise<UnsignedTransaction> {
    await this.initializeProvider();
    return await NftTransaction.createNestMintToTransaction(
      context,
      this.evmChain,
      parentCollectionAddress,
      parentNftId,
      childCollection,
      quantity,
    );
  }

  async createBurnNftTransaction(
    context: ServiceContext,
    collection: Collection,
    tokenId: number,
  ): Promise<UnsignedTransaction> {
    await this.initializeProvider();
    return await NftTransaction.createBurnNftTransaction(
      context,
      this.evmChain,
      collection,
      tokenId,
    );
  }

  async getTransactionByHash(txHash: string): Promise<TransactionReceipt> {
    await this.initializeProvider();
    return await this.provider.getTransactionReceipt(txHash);
  }

  async isTransacionConfirmed(txReceipt: TransactionReceipt): Promise<boolean> {
    await this.initializeProvider();
    if (txReceipt) {
      return !!(txReceipt.confirmations > 1 && txReceipt.blockNumber);
    }
    return false;
  }

  async getContractOwner(context: ServiceContext, collection: Collection) {
    await this.initializeProvider();
    const { contractAddress, collectionType, contractVersion_id } = collection;

    const { abi } = await new ContractVersion({}, context).getContractVersion(
      collectionType,
      contractVersion_id,
    );

    const nftContract: Contract = new Contract(
      contractAddress,
      abi,
      this.provider,
    );
    return await nftContract.owner();
  }

  /**
   * Num of minted NFTs can be acquired, if contract is deployed to chain
   * @param collection
   * @returns
   */
  async getNumberOfMintedNfts(
    context: ServiceContext,
    collection: Collection,
  ): Promise<number> {
    if (
      (collection.collectionStatus != CollectionStatus.DEPLOYED &&
        collection.collectionStatus != CollectionStatus.TRANSFERED) ||
      !collection.contractAddress
    ) {
      return 0;
    }

    await this.initializeProvider();
    const { abi } = await new ContractVersion({}, context).getContractVersion(
      collection.collectionType,
      collection.contractVersion_id,
    );

    const nftContract: Contract = new Contract(
      collection.contractAddress,
      abi,
      this.provider,
    );
    const totalSupply = await nftContract.totalSupply();
    return parseInt(totalSupply._hex, 16);
  }

  /**
   * Checks if collection implements RMRK interface
   * @param collection - The NFT collection
   * @param contractAddress address where collection is deployed
   */
  async implementsRmrkInterface(
    context: ServiceContext,
    collection: Collection,
  ): Promise<boolean> {
    await this.initializeProvider();
    const { contractAddress, collectionType, contractVersion_id } = collection;

    const { abi } = await new ContractVersion({}, context).getContractVersion(
      collectionType,
      contractVersion_id,
    );

    const nftContract: Contract = new Contract(
      contractAddress,
      abi,
      this.provider,
    );
    try {
      return await nftContract.supportsInterface('0x42b0e56f');
    } catch (e: any) {
      return false;
    }
  }
}
