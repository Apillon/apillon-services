import {
  AppEnvironment,
  DeployNftContractDto,
  MintNftDTO,
  env,
} from '@apillon/lib';
import { Contract, ethers, Wallet } from 'ethers';
import { NftTransaction } from '../../lib/nft-contract-transaction';
import {
  TransactionRequest,
  TransactionResponse,
  TransactionReceipt,
} from '@ethersproject/providers';
import { PayableNft } from '../../lib/contracts/payable-mint-nft';

export class WalletService {
  private wallet: Wallet;
  private provider: ethers.providers.StaticJsonRpcProvider;
  private prodEnv = env.APP_ENV === AppEnvironment.PROD;
  private walletAddress: string;

  constructor() {
    // this.provider = new ethers.providers.StaticJsonRpcProvider(
    //   this.prodEnv
    //     ? env.NFTS_MOONBEAM_MAINNET_RPC
    //     : env.NFTS_MOONBEAM_TESTNET_RPC,
    //   {
    //     chainId: this.prodEnv ? 1284 : 1287,
    //     name: this.prodEnv ? 'moonbeam' : 'moonbase-alphanet',
    //   },
    // );

    const rpcUrl = this.prodEnv
      ? env.NFTS_MOONBEAM_MAINNET_RPC
      : env.NFTS_MOONBEAM_TESTNET_RPC;

    console.log('RPC URL:', rpcUrl);

    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    this.wallet = new Wallet(
      this.prodEnv
        ? env.NFTS_MOONBEAM_MAINNET_PRIVATEKEY
        : env.NFTS_MOONBEAM_TESTNET_PRIVATEKEY,
      this.provider,
    );
    console.log(
      `Wallet initialization (address=${
        this.wallet.address
      }) & RPC initialization ${JSON.stringify(this.provider.network)}`,
    );
  }

  async getCurrentMaxNonce() {
    return await this.provider.getTransactionCount(this.wallet.address);
  }

  async createDeployTransaction(
    params: DeployNftContractDto,
    nonce: number,
  ): Promise<TransactionRequest> {
    return NftTransaction.createDeployContractTransaction(
      await this.getWalletAddress(),
      params,
      this.provider,
      nonce,
    );
  }

  async createTransferOwnershipTransaction(
    contract: string,
    newOwner: string,
    nonce: number,
  ): Promise<TransactionRequest> {
    return NftTransaction.createTransferOwnershipTransaction(
      await this.getWalletAddress(),
      contract,
      newOwner,
      this.provider,
      nonce,
    );
  }

  async createSetNftBaseUriTransaction(
    contract: string,
    uri: string,
    nonce: number,
  ) {
    return NftTransaction.createSetNftBaseUriTransaction(
      await this.getWalletAddress(),
      contract,
      uri,
      this.provider,
      nonce,
    );
  }

  async createMintToTransaction(
    contract: string,
    params: MintNftDTO,
    nonce: number,
  ) {
    return NftTransaction.createMintToTransaction(
      await this.getWalletAddress(),
      contract,
      params,
      this.provider,
      nonce,
    );
  }

  async signTransaction(request: TransactionRequest): Promise<string> {
    return this.wallet.signTransaction(request);
  }

  async sendTransaction(rawTransaction: string): Promise<TransactionResponse> {
    return this.provider.sendTransaction(rawTransaction);
  }

  async getTransactionByHash(txHash: string): Promise<TransactionReceipt> {
    return await this.provider.getTransactionReceipt(txHash);
  }

  async isTransacionConfirmed(txReceipt: TransactionReceipt): Promise<boolean> {
    if (txReceipt) {
      return !!(txReceipt.confirmations > 1 && txReceipt.blockNumber);
    }
    return false;
  }

  async getContractOwner(contractAddress: string) {
    const nftContract: Contract = new Contract(
      contractAddress,
      PayableNft.abi,
      this.provider,
    );
    return await nftContract.owner();
  }

  async getWalletAddress(): Promise<string> {
    return this.wallet.getAddress();
  }
}
