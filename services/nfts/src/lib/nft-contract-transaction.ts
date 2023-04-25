import { EvmChain, MintNftDTO } from '@apillon/lib';
import {
  Contract,
  ContractFactory,
  PopulatedTransaction,
  UnsignedTransaction,
} from 'ethers';
import { EvmNftABI, EvmNftBytecode } from './contracts/deployed-nft-contract';
import { TransactionRequest } from '@ethersproject/providers';
import { TransactionUtils } from './utils/transaction-utils';
import { Collection } from '../modules/nfts/models/collection.model';

export class NftTransaction {
  /**
   * @param params CreateCollectionDTO parameters
   * @returns UnsignedTransaction
   */
  static async createDeployContractTransaction(
    params: Collection,
  ): Promise<UnsignedTransaction> {
    console.log(
      `[${
        EvmChain[params.chain]
      }] Creating NFT deploy contract transaction from wallet address: ${
        params.deployerAddress
      }, parameters=${JSON.stringify(params)}`,
    );
    const nftContract: ContractFactory = new ContractFactory(
      EvmNftABI,
      EvmNftBytecode,
    );

    const txData: TransactionRequest = await nftContract.getDeployTransaction(
      params.name,
      params.symbol,
      params.baseUri,
      params.baseExtension,
      [params.isDrop, params.isSoulbound, params.isRevokable],
      TransactionUtils.convertBaseToGwei(params.mintPrice),
      params.dropStart,
      params.maxSupply,
      params.reserve,
      params.royaltiesAddress,
      params.royaltiesFees,
    );

    return {
      to: null,
      data: txData.data,
      type: 2,
    };
  }

  /**
   * @param contractAddress contract address to transfer
   * @param newOwner new owner of contract
   * @returns UnsignedTransaction
   */
  static async createTransferOwnershipTransaction(
    chain: EvmChain,
    contractAddress: string,
    newOwner: string,
  ): Promise<UnsignedTransaction> {
    console.log(
      `[${EvmChain[chain]}] Creating NFT transfer ownership (NFT contract address=${contractAddress}) transaction to wallet address: ${newOwner}`,
    );
    const nftContract: Contract = new Contract(contractAddress, EvmNftABI);

    const txData: PopulatedTransaction =
      await nftContract.populateTransaction.transferOwnership(newOwner);
    return {
      to: contractAddress,
      data: txData.data,
      type: 2,
    };
  }

  /**
   *
   * @param contractAddress contract to set baseUri
   * @param uri URI (ipfs base uri) to set
   * @returns UnsignedTransaction
   */
  static async createSetNftBaseUriTransaction(
    chain: EvmChain,
    contractAddress: string,
    uri: string,
  ): Promise<UnsignedTransaction> {
    console.log(
      `[${EvmChain[chain]}] Creating NFT set base token URI transaction (contract=${contractAddress}, uri=${uri}).`,
    );
    const nftContract: Contract = new Contract(contractAddress, EvmNftABI);

    const txData: PopulatedTransaction =
      await nftContract.populateTransaction.setBaseURI(uri);

    return {
      to: contractAddress,
      data: txData.data,
      type: 2,
    };
  }

  /**
   * @param contractAddress NFT contract address
   * @param address address to which NFT will be minted
   * @returns UnsignedTransaction
   */
  static async createMintToTransaction(
    chain: EvmChain,
    contractAddress: string,
    params: MintNftDTO,
  ): Promise<UnsignedTransaction> {
    console.log(
      `[${EvmChain[chain]}] Creating NFT (NFT contract=${contractAddress}) mint transaction (toAddress=${params.receivingAddress}).`,
    );
    const nftContract: Contract = new Contract(contractAddress, EvmNftABI);

    const txData: PopulatedTransaction =
      await nftContract.populateTransaction.ownerMint(
        params.quantity,
        params.receivingAddress,
      );
    return {
      to: contractAddress,
      data: txData.data,
      type: 2,
    };
  }

  /**
   * @param contractAddress NFT contract address
   * @param tokenId tokenId to burn
   * @returns UnsignedTransaction
   */
  static async createBurnNftTransaction(
    chain: EvmChain,
    contractAddress: string,
    tokenId: number,
  ): Promise<UnsignedTransaction> {
    console.log(
      `[${EvmChain[chain]}] Creating NFT (NFT contract=${contractAddress}) burn NFT transaction (tokenId=${tokenId}).`,
    );
    const nftContract: Contract = new Contract(contractAddress, EvmNftABI);

    const txData: PopulatedTransaction =
      await nftContract.populateTransaction.burn(tokenId);

    return {
      to: contractAddress,
      data: txData.data,
      type: 2,
    };
  }
}
