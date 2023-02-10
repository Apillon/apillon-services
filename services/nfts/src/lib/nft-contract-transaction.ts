import { DeployNftContractDto } from '@apillon/lib/dist/lib/at-services/nfts/dtos/deploy-nft-contract.dto';
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
    params: DeployNftContractDto,
    provider: BaseProvider,
  ): Promise<TransactionRequest> {
    const walletAddress = '0xBa01526C6D80378A9a95f1687e9960857593983B';
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
        params.symbol,
        params.name,
        params.maxSupply,
        TransactionUtils.convertBaseToGwei(params.mintPrice),
      );

    const chainId = (await provider.getNetwork()).chainId;
    const txCount = await provider.getTransactionCount(walletAddress);

    const transaction: TransactionRequest = {
      from: walletAddress,
      to: null,
      value: 0,
      gasLimit: '8000000',
      nonce: ethers.utils.hexlify(txCount),
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
    contract: string,
    newOwner: string,
    provider: BaseProvider,
  ): Promise<TransactionRequest> {
    console.log(
      `Creating NFT transfer ownership (NFT contract address=${contract}) transaction to wallet address: ${newOwner}`,
    );
    const walletAddress = '0xBa01526C6D80378A9a95f1687e9960857593983B';
    const nftContract: Contract = new Contract(contract, PayableNft.abi);

    const contractData: UnsignedTransaction =
      await nftContract.populateTransaction.transferOwnership(newOwner);

    const chainId = (await provider.getNetwork()).chainId;
    const txCount = await provider.getTransactionCount(walletAddress);

    const transaction: TransactionRequest = {
      from: walletAddress,
      to: contract,
      value: 0,
      gasLimit: '8000000',
      nonce: ethers.utils.hexlify(txCount),
      type: 2,
      chainId,
      data: contractData.data,
    };

    await this.populateGas(transaction, provider);
    return transaction;
  }

  /**
   *
   * @param contract contract to set baseUri
   * @param uri URI (ipfs base uri) to set
   * @param provider RPC provider
   * @returns TransactionRequest
   */
  static async createSetNftBaseUriTransaction(
    contract: string,
    uri: string,
    provider: BaseProvider,
  ): Promise<TransactionRequest> {
    console.log(
      `Creating NFT set base token URI transaction (contract=${contract}, uri=${uri}).`,
    );
    const walletAddress = '0xBa01526C6D80378A9a95f1687e9960857593983B';
    const nftContract: Contract = new Contract(contract, PayableNft.abi);

    const contractData: UnsignedTransaction =
      await nftContract.populateTransaction.setBaseTokenURI(uri);

    const chainId = (await provider.getNetwork()).chainId;
    const txCount = await provider.getTransactionCount(walletAddress);

    const transaction: TransactionRequest = {
      from: walletAddress,
      to: contract,
      value: 0,
      gasLimit: '8000000',
      nonce: ethers.utils.hexlify(txCount),
      type: 2,
      chainId,
      data: contractData.data,
    };

    await this.populateGas(transaction, provider);
    return transaction;
  }

  /**
   * @param contract NFT contract address
   * @param address address to which NFT will be minted
   * @param provider RPC provider
   * @returns TransactionRequest
   */
  static async createMintToTransaction(
    contract: string,
    address: string,
    provider: BaseProvider,
  ) {
    console.log(
      `Creating NFT (NFT contract=${contract}) mint transaction (toAddress=${address}).`,
    );
    const walletAddress = '0xBa01526C6D80378A9a95f1687e9960857593983B';
    const nftContract: Contract = new Contract(contract, PayableNft.abi);

    const contractData: UnsignedTransaction =
      await nftContract.populateTransaction.mintTo(address);

    const chainId = (await provider.getNetwork()).chainId;
    const txCount = await provider.getTransactionCount(walletAddress);

    const transaction: TransactionRequest = {
      from: walletAddress,
      to: contract,
      value: 0,
      gasLimit: '8000000',
      nonce: ethers.utils.hexlify(txCount),
      type: 2,
      chainId,
      data: contractData.data,
    };

    await this.populateGas(transaction, provider);
    return transaction;
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
}
