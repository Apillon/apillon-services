import {
  BlockchainMicroservice,
  ChainType,
  Context,
  EvmChain,
  MintNftDTO,
} from '@apillon/lib';
import { TransactionReceipt } from '@ethersproject/providers';
import { Contract, UnsignedTransaction, ethers } from 'ethers';
import { EvmNftABI } from '../../lib/contracts/deployed-nft-contract';
import { NftTransaction } from '../../lib/nft-contract-transaction';
import { Collection } from '../nfts/models/collection.model';
import { CollectionStatus } from '../../config/types';

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
  ): Promise<UnsignedTransaction> {
    await this.initializeProvider();
    return await NftTransaction.createTransferOwnershipTransaction(
      this.evmChain,
      contract,
      newOwner,
    );
  }

  async createSetNftBaseUriTransaction(
    contract: string,
    uri: string,
  ): Promise<UnsignedTransaction> {
    await this.initializeProvider();
    return await NftTransaction.createSetNftBaseUriTransaction(
      this.evmChain,
      contract,
      uri,
    );
  }

  async createMintToTransaction(
    contract: string,
    params: MintNftDTO,
  ): Promise<UnsignedTransaction> {
    await this.initializeProvider();
    return await NftTransaction.createMintToTransaction(
      this.evmChain,
      contract,
      params,
    );
  }

  async createBurnNftTransaction(
    contract: string,
    tokenId: number,
  ): Promise<UnsignedTransaction> {
    await this.initializeProvider();
    return await NftTransaction.createBurnNftTransaction(
      this.evmChain,
      contract,
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
      !collection.contractAddress
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
}
