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
import { ServiceContext } from '@apillon/service-lib';
import { ContractVersion } from '../modules/nfts/models/contractVersion.model';

export class NftTransaction {
  /**
   * @param params CreateCollectionDTO parameters
   * @param abi contract ABI
   * @param bytecode contract bytecode
   * @returns UnsignedTransaction
   */
  static async createDeployContractTransaction(
    params: Collection,
    abi: string,
    bytecode: string,
  ): Promise<UnsignedTransaction> {
    console.log(
      `[${
        EvmChain[params.chain]
      }] Creating NFT deploy contract transaction from wallet address: ${
        params.deployerAddress
      }, parameters=${JSON.stringify(params)}`,
    );

    const nftContract = new ContractFactory(abi, bytecode);

    const royaltiesFees = Math.round(params.royaltiesFees * 100);
    const maxSupply =
      params.maxSupply === 0 ? constants.MaxUint256 : params.maxSupply;
    let txData;
    switch (params.collectionType) {
      case NFTCollectionType.GENERIC:
        txData = nftContract.getDeployTransaction(
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
          params.royaltiesAddress ??
            '0x0000000000000000000000000000000000000000',
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
   * @param collection The NFT collection
   * @param newOwner new owner of contract
   * @param abi contract ABI
   * @returns UnsignedTransaction
   */
  static async createTransferOwnershipTransaction(
    chain: EvmChain,
    collection: Collection,
    newOwner: string,
    abi: string,
  ): Promise<UnsignedTransaction> {
    const { contractAddress, collectionType } = collection;

    console.log(
      `[${EvmChain[chain]}] Creating NFT transfer ownership (NFT contract address=${contractAddress}, collection type=${collectionType}) transaction to wallet address: ${newOwner}`,
    );
    const nftContract = new Contract(contractAddress, abi);

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
   * @param collection The NFT collection
   * @param uri URI (ipfs base uri) to set
   * @param abi contract ABI
   * @returns UnsignedTransaction
   */
  static async createSetNftBaseUriTransaction(
    chain: EvmChain,
    collection: Collection,
    uri: string,
    abi: string,
  ): Promise<UnsignedTransaction> {
    const { contractAddress, collectionType } = collection;

    console.log(
      `[${EvmChain[chain]}] Creating NFT set base token URI transaction (contract=${contractAddress}, uri=${uri}, collection type=${collectionType}).`,
    );
    const nftContract: Contract = new Contract(contractAddress, abi);

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
   * @param collection The NFT collection
   * @param params MintNftDTO parameters
   * @param abi contract ABI
   * @returns UnsignedTransaction
   */
  static async createMintToTransaction(
    chain: EvmChain,
    collection: Collection,
    params: MintNftDTO,
    abi: string,
  ): Promise<UnsignedTransaction> {
    const { contractAddress, collectionType } = collection;

    console.log(
      `[${EvmChain[chain]}] Creating NFT (NFT contract=${contractAddress}) mint transaction (toAddress=${params.receivingAddress}, collection type=${collectionType}).`,
    );

    const nftContract: Contract = new Contract(contractAddress, abi);

    const txData: PopulatedTransaction = collection.isAutoIncrement
      ? await nftContract.populateTransaction.ownerMint(
          params.receivingAddress,
          params.quantity,
        )
      : await nftContract.populateTransaction.ownerMintIds(
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
   * @param context application context
   * @param chain EVM chain used
   * @param parentCollectionAddress collection under which we are mint nesting NFT
   * @param parentNftId NFT id under which we are mint nesting NFT
   * @param childCollection - The child NFT collection
   * @param quantity number of NFTs to nest mint
   * @returns UnsignedTransaction
   */
  static async createNestMintToTransaction(
    context: ServiceContext,
    chain: EvmChain,
    parentCollectionAddress: string,
    parentNftId: number,
    childCollection: Collection,
    quantity: number,
  ): Promise<UnsignedTransaction> {
    const { contractAddress, collectionType, contractVersion_id } =
      childCollection;

    console.log(
      `[${EvmChain[chain]}] Creating NFT (NFT contract=${contractAddress}) nest mint transaction (toAddress=${parentCollectionAddress}, collection type=${collectionType}).`,
    );

    const abi = await new ContractVersion({}, context).getContractAbi(
      collectionType,
      contractVersion_id,
    );

    const nftContract: Contract = new Contract(contractAddress, abi);

    const txData: PopulatedTransaction =
      await nftContract.populateTransaction.ownerNestMint(
        parentCollectionAddress,
        quantity,
        parentNftId,
      );

    return {
      to: contractAddress,
      data: txData.data,
      type: 2,
    };
  }

  /**
   * @param chain EVM chain used
   * @param collection - The NFT collection
   * @param tokenId tokenId to burn
   * @param abi contract ABI
   * @returns UnsignedTransaction
   */
  static async createBurnNftTransaction(
    chain: EvmChain,
    collection: Collection,
    tokenId: number,
    abi: string,
  ): Promise<UnsignedTransaction> {
    const { contractAddress, collectionType } = collection;

    console.log(
      `[${EvmChain[chain]}] Creating NFT (NFT contract=${contractAddress}) burn NFT transaction (tokenId=${tokenId}, collection type=${collectionType}).`,
    );

    const nftContract: Contract = new Contract(contractAddress, abi);

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
