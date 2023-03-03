import { DeployNftContractDto, MintNftDTO } from '@apillon/lib';
import { Contract, ContractFactory, ethers, UnsignedTransaction } from 'ethers';
import { PayableNft } from './contracts/payable-mint-nft';
import { TransactionRequest, BaseProvider } from '@ethersproject/providers';
import { TransactionUtils } from './utils/transaction-utils';

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

    return await this.createContractTransactionRequest(
      walletAddress,
      null,
      contractData.data,
      nonce,
      provider,
    );
  }

  /**
   * @param contractAddress contract address to transfer
   * @param newOwner new owner of contract
   * @param provider RPC provider
   * @returns TransactionRequest
   */
  static async createTransferOwnershipTransaction(
    walletAddress: string,
    contractAddress: string,
    newOwner: string,
    provider: BaseProvider,
    nonce: number,
  ): Promise<TransactionRequest> {
    console.log(
      `Creating NFT transfer ownership (NFT contract address=${contractAddress}) transaction to wallet address: ${newOwner}`,
    );
    const nftContract: Contract = new Contract(contractAddress, PayableNft.abi);

    const contractData: UnsignedTransaction =
      await nftContract.populateTransaction.transferOwnership(newOwner);

    return await this.createContractTransactionRequest(
      walletAddress,
      contractAddress,
      contractData.data,
      nonce,
      provider,
    );
  }

  /**
   *
   * @param contractAddress contract to set baseUri
   * @param uri URI (ipfs base uri) to set
   * @param provider RPC provider
   * @returns TransactionRequest
   */
  static async createSetNftBaseUriTransaction(
    walletAddress: string,
    contractAddress: string,
    uri: string,
    provider: BaseProvider,
    nonce: number,
  ): Promise<TransactionRequest> {
    console.log(
      `Creating NFT set base token URI transaction (contract=${contractAddress}, uri=${uri}).`,
    );
    const nftContract: Contract = new Contract(contractAddress, PayableNft.abi);

    const contractData: UnsignedTransaction =
      await nftContract.populateTransaction.setBaseURI(uri);

    return await this.createContractTransactionRequest(
      walletAddress,
      contractAddress,
      contractData.data,
      nonce,
      provider,
    );
  }

  /**
   * @param contractAddress NFT contract address
   * @param address address to which NFT will be minted
   * @param provider RPC provider
   * @returns TransactionRequest
   */
  static async createMintToTransaction(
    walletAddress: string,
    contractAddress: string,
    params: MintNftDTO,
    provider: BaseProvider,
    nonce: number,
  ) {
    console.log(
      `Creating NFT (NFT contract=${contractAddress}) mint transaction (toAddress=${params.receivingAddress}).`,
    );
    const nftContract: Contract = new Contract(contractAddress, PayableNft.abi);

    const contractData: UnsignedTransaction =
      await nftContract.populateTransaction.ownerMint(
        params.quantity,
        params.receivingAddress,
      );

    return await this.createContractTransactionRequest(
      walletAddress,
      contractAddress,
      contractData.data,
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
    // TODO: On production check how gas estimate is calculated
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
    txData: ethers.utils.BytesLike,
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
      data: txData,
    };
    await this.populateGas(transaction, provider);
    return transaction;
  }
}
