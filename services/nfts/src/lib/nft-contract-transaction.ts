import { DeployNftContractDto, MintNftDTO } from '@apillon/lib';
import { Contract, ContractFactory, ethers, UnsignedTransaction } from 'ethers';
import { PayableNft } from './contracts/payable-mint-nft';
import { Injectable, Scope } from '@nestjs/common';
import { TransactionRequest, BaseProvider } from '@ethersproject/providers';
import { TransactionUtils } from './utils/transaction-utils';

@Injectable({ scope: Scope.REQUEST })
export class NftTransaction {
  /**
   * @param params DeployNftContractDto parameters
   * @param provider RPC provider
   * @returns TransactionRequest
   */
  static async createDeployContractTransaction(
    walletAddress: string,
    params: DeployNftContractDto,
    provider: BaseProvider,
    nonce: number,
  ): Promise<TransactionRequest> {
    console.log(
      `Creating NFT deploy contract transaction from wallet address: ${walletAddress}, parameters=${JSON.stringify(
        params,
      )}`,
    );

    const nftContract: ContractFactory = new ContractFactory(
      PayableNft.abi,
      PayableNft.bytecode,
    );

    const contractData: TransactionRequest =
      await nftContract.getDeployTransaction(
        params.name,
        params.symbol,
        params.baseUri,
        params.baseExtension,
        [params.isDrop, false, false],
        TransactionUtils.convertBaseToGwei(params.mintPrice),
        params.dropStart,
        params.maxSupply,
        params.reserve,
        walletAddress,
        5,
      );

    const chainId = (await provider.getNetwork()).chainId;
    const txCount = await provider.getTransactionCount(walletAddress);

    const transaction: TransactionRequest = {
      from: walletAddress,
      to: null,
      value: 0,
      gasLimit: '8000000',
      nonce: ethers.utils.hexlify(nonce || txCount),
      type: 2,
      chainId,
      data: contractData.data,
    };

    await this.populateGas(transaction, provider);
    return transaction;
  }

  /**
   * @param contract contract address to transfer
   * @param newOwner new owner of contract
   * @param provider RPC provider
   * @returns TransactionRequest
   */
  static async createTransferOwnershipTransaction(
    walletAddress: string,
    contract: string,
    newOwner: string,
    provider: BaseProvider,
    nonce: number,
  ): Promise<TransactionRequest> {
    console.log(
      `Creating NFT transfer ownership (NFT contract address=${contract}) transaction to wallet address: ${newOwner}`,
    );
    const nftContract: Contract = new Contract(contract, PayableNft.abi);

    const contractData: UnsignedTransaction =
      await nftContract.populateTransaction.transferOwnership(newOwner);

    return await this.createContractTransactionRequest(
      walletAddress,
      contract,
      contractData,
      nonce,
      provider,
    );
  }

  /**
   *
   * @param contract contract to set baseUri
   * @param uri URI (ipfs base uri) to set
   * @param provider RPC provider
   * @returns TransactionRequest
   */
  static async createSetNftBaseUriTransaction(
    walletAddress: string,
    contract: string,
    uri: string,
    provider: BaseProvider,
    nonce: number,
  ): Promise<TransactionRequest> {
    console.log(
      `Creating NFT set base token URI transaction (contract=${contract}, uri=${uri}).`,
    );
    const nftContract: Contract = new Contract(contract, PayableNft.abi);

    const contractData: UnsignedTransaction =
      await nftContract.populateTransaction.setBaseURI(uri);

    return await this.createContractTransactionRequest(
      walletAddress,
      contract,
      contractData,
      nonce,
      provider,
    );
  }

  /**
   * @param contract NFT contract address
   * @param address address to which NFT will be minted
   * @param provider RPC provider
   * @returns TransactionRequest
   */
  static async createMintToTransaction(
    walletAddress: string,
    contract: string,
    params: MintNftDTO,
    provider: BaseProvider,
    nonce: number,
  ) {
    console.log(
      `Creating NFT (NFT contract=${contract}) mint transaction (toAddress=${params.receivingAddress}).`,
    );
    const nftContract: Contract = new Contract(contract, PayableNft.abi);

    const contractData: UnsignedTransaction =
      await nftContract.populateTransaction.ownerMint(
        params.quantity,
        params.receivingAddress,
      );

    return await this.createContractTransactionRequest(
      walletAddress,
      contract,
      contractData,
      nonce,
      provider,
    );
  }

  /**
   * @param transaction raw (unsigned) TransactionRequest
   * @param provider RPC provider
   */
  private static async populateGas(
    transaction: TransactionRequest,
    provider: BaseProvider,
  ) {
    const maxPriorityFeePerGas = ethers.utils
      .parseUnits('30', 'gwei')
      .toNumber();
    const estimatedBaseFee = (await provider.getGasPrice()).toNumber();

    // Ensuring that transaction is desirable for at least 6 blocks.
    const maxFeePerGas = estimatedBaseFee * 2 + maxPriorityFeePerGas;
    transaction.maxPriorityFeePerGas = maxPriorityFeePerGas;
    transaction.maxFeePerGas = maxFeePerGas;

    const gas = await provider.estimateGas(transaction);
    console.log(`Estimated gas=${gas}`);
    // Increasing gas limit by 10% of current gas price to be on the safe side
    const gasLimit = Math.floor(gas.toNumber() * 1.1);
    transaction.gasLimit = gasLimit.toString();
  }

  /**
   * Function creates transaction request - interaction with contract (smart contract call).
   *
   * @param walletAddress our wallet public address
   * @param contractAddress contract address to interact with
   * @param unsignedTx unsigned transaction
   * @param nonce nonce
   * @param provider RPC provider
   * @returns TransactionRequest
   */
  private static async createContractTransactionRequest(
    walletAddress: string,
    contractAddress: string,
    unsignedTx: UnsignedTransaction,
    nonce: number,
    provider: BaseProvider,
  ): Promise<TransactionRequest> {
    const chainId = (await provider.getNetwork()).chainId;
    const txCount = await provider.getTransactionCount(walletAddress);

    const transaction: TransactionRequest = {
      from: walletAddress,
      to: contractAddress,
      value: 0,
      gasLimit: '8000000',
      nonce: ethers.utils.hexlify(nonce || txCount),
      type: 2,
      chainId,
      data: unsignedTx.data,
    };
    await this.populateGas(transaction, provider);
    return transaction;
  }
}
