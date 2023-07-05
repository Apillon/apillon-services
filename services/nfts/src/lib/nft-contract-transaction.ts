import { EvmChain, MintNftDTO, NFTCollectionType } from '@apillon/lib';
import {
  constants,
  Contract,
  ContractFactory,
  PopulatedTransaction,
  UnsignedTransaction,
} from 'ethers';
import {
  EvmNftABI,
  EvmNftBytecode,
  EvmNftRmrkABI,
} from './contracts/deployed-nft-contract';
import { TransactionUtils } from './utils/transaction-utils';
import { Collection } from '../modules/nfts/models/collection.model';
import { NftsCodeException } from './exceptions';
import { NftsErrorCode } from '../config/types';

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
    let txData;
    switch (params.collectionType) {
      case NFTCollectionType.GENERIC:
        const genericNftContract = new ContractFactory(
          EvmNftABI,
          EvmNftBytecode,
        );
        txData = await genericNftContract.getDeployTransaction(
          params.name,
          params.symbol,
          params.baseUri,
          params.baseExtension,
          [params.drop, params.isSoulbound, params.isRevokable],
          TransactionUtils.convertBaseToGwei(params.dropPrice),
          params.dropStart,
          params.maxSupply,
          params.dropReserve,
          params.royaltiesAddress,
          params.royaltiesFees,
        );
        break;
      case NFTCollectionType.NESTABLE:
        const nestableNftContract = new ContractFactory(
          EvmNftRmrkABI,
          EvmNftBytecode,
        );
        txData = await nestableNftContract.getDeployTransaction(
          params.name,
          params.symbol,
          params.baseUri,
          params.baseExtension,
          [params.drop, params.isSoulbound, params.isRevokable],
          params.dropStart,
          params.dropReserve,
          {
            erc20TokenAddress: constants.AddressZero,
            tokenUriIsEnumerable: true,
            royaltyRecipient: params.royaltiesAddress,
            royaltyPercentageBps: params.royaltiesFees,
            maxSupply: params.maxSupply,
            pricePerMint: TransactionUtils.convertBaseToGwei(params.dropPrice),
          },
        );
        break;
      default:
        throw new NftsCodeException({
          status: 500,
          code: NftsErrorCode.GENERAL_SERVER_ERROR,
        });
    }

    return {
      to: null,
      data: txData.data,
      type: 2,
    };
  }

  /**
   * @param chain EVM chain used
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
   * @param chain EVM chain used
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
   * @param chain EVM chain used
   * @param contractAddress NFT contract address
   * @param params MintNftDTO parameters
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
        params.receivingAddress,
        params.quantity,
      );
    return {
      to: contractAddress,
      data: txData.data,
      type: 2,
    };
  }

  /**
   * @param chain EVM chain used
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
