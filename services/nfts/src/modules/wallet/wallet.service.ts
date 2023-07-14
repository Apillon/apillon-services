import {
  AppEnvironment,
  BlockchainMicroservice,
  ChainType,
  Context,
  env,
  EvmChain,
  MintNftDTO,
  NFTCollectionType,
} from '@apillon/lib';
import { TransactionReceipt } from '@ethersproject/providers';
import { Contract, ethers, UnsignedTransaction } from 'ethers';
import { EvmNftABI } from '../../lib/contracts/deployed-nft-contract';
import { NftTransaction } from '../../lib/nft-contract-transaction';
import { Collection } from '../nfts/models/collection.model';
import { CollectionStatus } from '../../config/types';
import { getNftContractAbi } from '../../lib/utils/collection-utils';

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
    params: Collection,
  ): Promise<UnsignedTransaction> {
    await this.initializeProvider();
    return await NftTransaction.createDeployContractTransaction(params);
  }

  async createTransferOwnershipTransaction(
    contract: string,
    newOwner: string,
    collectionType: NFTCollectionType,
  ): Promise<UnsignedTransaction> {
    await this.initializeProvider();
    return await NftTransaction.createTransferOwnershipTransaction(
      this.evmChain,
      contract,
      newOwner,
      collectionType,
    );
  }

  async createSetNftBaseUriTransaction(
    contract: string,
    uri: string,
    collectionType: NFTCollectionType,
  ): Promise<UnsignedTransaction> {
    await this.initializeProvider();
    return await NftTransaction.createSetNftBaseUriTransaction(
      this.evmChain,
      contract,
      collectionType,
      uri,
    );
  }

  async createMintToTransaction(
    contract: string,
    collectionType: NFTCollectionType,
    params: MintNftDTO,
  ): Promise<UnsignedTransaction> {
    await this.initializeProvider();
    return await NftTransaction.createMintToTransaction(
      this.evmChain,
      contract,
      collectionType,
      params,
    );
  }

  async createNestMintToTransaction(
    destinationCollectionAddress: string,
    destinationNftId: number,
    contract: string,
    collectionType: NFTCollectionType,
    quantity: number,
  ): Promise<UnsignedTransaction> {
    await this.initializeProvider();
    return await NftTransaction.createNestMintToTransaction(
      this.evmChain,
      destinationCollectionAddress,
      destinationNftId,
      contract,
      collectionType,
      quantity,
    );
  }

  async createBurnNftTransaction(
    contract: string,
    collectionType: NFTCollectionType,
    tokenId: number,
  ): Promise<UnsignedTransaction> {
    await this.initializeProvider();
    return await NftTransaction.createBurnNftTransaction(
      this.evmChain,
      contract,
      collectionType,
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

  async getContractOwner(contractAddress: string) {
    await this.initializeProvider();
    const nftContract: Contract = new Contract(
      contractAddress,
      EvmNftABI,
      this.provider,
    );
    return await nftContract.owner();
  }

  /**
   * Num of minted NFTs can be acquired, if contract is deployed to chain
   * @param collection
   * @returns
   */
  async getNumberOfMintedNfts(collection: Collection): Promise<number> {
    if (
      (collection.collectionStatus != CollectionStatus.DEPLOYED &&
        collection.collectionStatus != CollectionStatus.TRANSFERED) ||
      !collection.contractAddress ||
      env.APP_ENV == AppEnvironment.TEST
    ) {
      return 0;
    }

    await this.initializeProvider();
    const nftContract: Contract = new Contract(
      collection.contractAddress,
      EvmNftABI,
      this.provider,
    );
    const totalSupply = await nftContract.totalSupply();
    return parseInt(totalSupply._hex, 16);
  }

  /**
   * Checks if collection implements RMRK interface
   * @param collectionType NFTCollectionType
   * @param contractAddress address where collection is deployed
   */
  async implementsRmrkInterface(
    collectionType: NFTCollectionType,
    contractAddress: string,
  ): Promise<boolean> {
    // calling supportsInterface fails during testing so this is a workaround
    if (env.APP_ENV === AppEnvironment.TEST) {
      return true;
    }
    await this.initializeProvider();

    const abi = getNftContractAbi(collectionType);
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
