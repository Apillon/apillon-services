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
import { getNftContractArtifact } from './utils/collection-utils';
import { ServiceContext } from '@apillon/service-lib';

export class NftTransaction {
  /**
   * @param params CreateCollectionDTO parameters
   * @returns UnsignedTransaction
   */
  static async createDeployContractTransaction(
    context: ServiceContext,
    params: Collection,
  ): Promise<UnsignedTransaction> {
    console.log(
      `[${
        EvmChain[params.chain]
      }] Creating NFT deploy contract transaction from wallet address: ${
        params.deployerAddress
      }, parameters=${JSON.stringify(params)}`,
    );

    const nftContractAbi = await getNftContractArtifact(
      context,
      params.collectionType,
    );

    const nftContractBytecode = await getNftContractArtifact(
      context,
      params.collectionType,
      'bytecode',
    );

    const nftContract = new ContractFactory(
      nftContractAbi,
      nftContractBytecode,
    );

    const royaltiesFees = Math.round(params.royaltiesFees * 100);
    const maxSupply =
      params.maxSupply === 0 ? constants.MaxUint256 : params.maxSupply;
    let txData;
    switch (params.collectionType) {
      case NFTCollectionType.GENERIC:
        txData = await nftContract.getDeployTransaction(
          params.name,
          params.symbol,
          params.baseUri,
          params.baseExtension,
          [
            params.drop,
            params.isSoulbound,
            params.isRevokable,
            params.isAutoIncrement,
          ],
          TransactionUtils.convertBaseToGwei(params.dropPrice),
          params.dropStart,
          maxSupply,
          params.dropReserve,
          params.royaltiesAddress,
          royaltiesFees,
        );
        break;
      case NFTCollectionType.NESTABLE:
        txData = await nftContract.getDeployTransaction(
          params.name,
          params.symbol,
          params.baseUri,
          params.baseExtension,
          [
            params.drop,
            params.isSoulbound,
            params.isRevokable,
            params.isAutoIncrement,
          ],
          params.dropStart,
          params.dropReserve,
          {
            royaltyRecipient: params.royaltiesAddress,
            royaltyPercentageBps: royaltiesFees,
            maxSupply,
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
    context: ServiceContext,
    chain: EvmChain,
    contractAddress: string,
    newOwner: string,
    collectionType: NFTCollectionType,
  ): Promise<UnsignedTransaction> {
    console.log(
      `[${EvmChain[chain]}] Creating NFT transfer ownership (NFT contract address=${contractAddress}, collection type=${collectionType}) transaction to wallet address: ${newOwner}`,
    );
    const nftContractAbi = await getNftContractArtifact(
      context,
      collectionType,
    );
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
    context: ServiceContext,
    chain: EvmChain,
    contractAddress: string,
    collectionType: NFTCollectionType,
    uri: string,
  ): Promise<UnsignedTransaction> {
    console.log(
      `[${EvmChain[chain]}] Creating NFT set base token URI transaction (contract=${contractAddress}, uri=${uri}, collection type=${collectionType}).`,
    );

    const nftContractAbi = await getNftContractArtifact(
      context,
      collectionType,
    );
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
    context: ServiceContext,
    chain: EvmChain,
    contractAddress: string,
    collectionType: NFTCollectionType,
    params: MintNftDTO,
  ): Promise<UnsignedTransaction> {
    console.log(
      `[${EvmChain[chain]}] Creating NFT (NFT contract=${contractAddress}) mint transaction (toAddress=${params.receivingAddress}, collection type=${collectionType}).`,
    );

    const nftContractAbi = await getNftContractArtifact(
      context,
      collectionType,
    );
    const nftContract: Contract = new Contract(contractAddress, nftContractAbi);

    const txData: PopulatedTransaction =
      await nftContract.populateTransaction.ownerMintIds(
        params.receivingAddress,
        params.quantity,
        params.idsToMint,
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
    context: ServiceContext,
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

    const nftContractAbi = await getNftContractArtifact(
      context,
      childCollectionType,
    );
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
    context: ServiceContext,
    chain: EvmChain,
    contractAddress: string,
    collectionType: NFTCollectionType,
    tokenId: number,
  ): Promise<UnsignedTransaction> {
    console.log(
      `[${EvmChain[chain]}] Creating NFT (NFT contract=${contractAddress}) burn NFT transaction (tokenId=${tokenId}, collection type=${collectionType}).`,
    );

    const nftContractAbi = await getNftContractArtifact(
      context,
      collectionType,
    );
    const nftContract: Contract = new Contract(contractAddress, nftContractAbi);

    const txData =
      collectionType === NFTCollectionType.NESTABLE
        ? await nftContract.populateTransaction.burn(
            tokenId,
            constants.MaxUint256,
          )
        : await nftContract.populateTransaction.burn(tokenId);

    return {
      to: contractAddress,
      data: txData.data,
      type: 2,
    };
  }
}
