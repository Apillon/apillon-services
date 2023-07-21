import { EvmChain, MintNftDTO, NFTCollectionType } from '@apillon/lib';
import {
  constants,
  Contract,
  ContractFactory,
  PopulatedTransaction,
  UnsignedTransaction,
} from 'ethers';
import { TransactionUtils } from './utils/transaction-utils';
import { Collection } from '../modules/nfts/models/collection.model';
import { NftsCodeException } from './exceptions';
import { NftsErrorCode } from '../config/types';
import {
  getNftContractAbi,
  getNftContractBytecode,
} from './utils/collection-utils';

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

    const nftContractAbi = getNftContractAbi(params.collectionType);
    const nftContractBytecode = getNftContractBytecode(params.collectionType);
    const nftContract = new ContractFactory(
      nftContractAbi,
      nftContractBytecode,
    );

    let txData;
    switch (params.collectionType) {
      case NFTCollectionType.GENERIC:
        txData = await nftContract.getDeployTransaction(
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
        txData = await nftContract.getDeployTransaction(
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
   * @param collectionType NFTCollectionType
   * @returns UnsignedTransaction
   */
  static async createTransferOwnershipTransaction(
    chain: EvmChain,
    contractAddress: string,
    newOwner: string,
    collectionType: NFTCollectionType,
  ): Promise<UnsignedTransaction> {
    console.log(
      `[${EvmChain[chain]}] Creating NFT transfer ownership (NFT contract address=${contractAddress}, collection type=${collectionType}) transaction to wallet address: ${newOwner}`,
    );
    const nftContractAbi = getNftContractAbi(collectionType);
    const nftContract = new Contract(contractAddress, nftContractAbi);

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
   * @param collectionType NFTCollectionType
   * @param uri URI (ipfs base uri) to set
   * @returns UnsignedTransaction
   */
  static async createSetNftBaseUriTransaction(
    chain: EvmChain,
    contractAddress: string,
    collectionType: NFTCollectionType,
    uri: string,
  ): Promise<UnsignedTransaction> {
    console.log(
      `[${EvmChain[chain]}] Creating NFT set base token URI transaction (contract=${contractAddress}, uri=${uri}, collection type=${collectionType}).`,
    );

    const nftContractAbi = getNftContractAbi(collectionType);
    const nftContract: Contract = new Contract(contractAddress, nftContractAbi);

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
   * @param collectionType NFTCollectionType
   * @param params MintNftDTO parameters
   * @returns UnsignedTransaction
   */
  static async createMintToTransaction(
    chain: EvmChain,
    contractAddress: string,
    collectionType: NFTCollectionType,
    params: MintNftDTO,
  ): Promise<UnsignedTransaction> {
    console.log(
      `[${EvmChain[chain]}] Creating NFT (NFT contract=${contractAddress}) mint transaction (toAddress=${params.receivingAddress}, collection type=${collectionType}).`,
    );

    const nftContractAbi = getNftContractAbi(collectionType);
    const nftContract: Contract = new Contract(contractAddress, nftContractAbi);

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
   * @param parentCollectionAddress collection under which we are mint nesting NFT
   * @param parentNftId NFT id under which we are mint nesting NFT
   * @param childCollectionAddress NFT contract address
   * @param childCollectionType NFTCollectionType
   * @param quantity number of NFTs to nest mint
   * @returns UnsignedTransaction
   */
  static async createNestMintToTransaction(
    chain: EvmChain,
    parentCollectionAddress: string,
    parentNftId: number,
    childCollectionAddress: string,
    childCollectionType: NFTCollectionType,
    quantity: number,
  ): Promise<UnsignedTransaction> {
    console.log(
      `[${EvmChain[chain]}] Creating NFT (NFT contract=${childCollectionAddress}) nest mint transaction (toAddress=${parentCollectionAddress}, collection type=${childCollectionType}).`,
    );

    const nftContractAbi = getNftContractAbi(childCollectionType);
    const nftContract: Contract = new Contract(
      childCollectionAddress,
      nftContractAbi,
    );

    const txData: PopulatedTransaction =
      await nftContract.populateTransaction.ownerNestMint(
        parentCollectionAddress,
        quantity,
        parentNftId,
      );

    return {
      to: childCollectionAddress,
      data: txData.data,
      type: 2,
    };
  }

  /**
   * @param chain EVM chain used
   * @param contractAddress NFT contract address
   * @param collectionType NFTCollectionType
   * @param tokenId tokenId to burn
   * @returns UnsignedTransaction
   */
  static async createBurnNftTransaction(
    chain: EvmChain,
    contractAddress: string,
    collectionType: NFTCollectionType,
    tokenId: number,
  ): Promise<UnsignedTransaction> {
    console.log(
      `[${EvmChain[chain]}] Creating NFT (NFT contract=${contractAddress}) burn NFT transaction (tokenId=${tokenId}, collection type=${collectionType}).`,
    );

    const nftContractAbi = getNftContractAbi(collectionType);
    const nftContract: Contract = new Contract(contractAddress, nftContractAbi);

    const txData: PopulatedTransaction =
      await nftContract.populateTransaction.burn(tokenId);

    return {
      to: contractAddress,
      data: txData.data,
      type: 2,
    };
  }
}
