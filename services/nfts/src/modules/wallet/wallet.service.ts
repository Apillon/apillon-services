import { AppEnvironment, env } from '@apillon/lib';
import { DeployNftContractDto } from '@apillon/lib/dist/lib/at-services/nfts/dtos/deploy-nft-contract.dto';
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
  private prodEnv = env.APP_ENV == AppEnvironment.PROD;

  constructor() {
    this.provider = new ethers.providers.StaticJsonRpcProvider(
      this.prodEnv
        ? env.NFTS_MOONBEAM_MAINNET_RPC
        : env.NFTS_MOONBEAM_TESTNET_RPC,
      {
        chainId: this.prodEnv ? 1284 : 1287,
        name: this.prodEnv ? 'moonbeam' : 'moonbase-alphanet',
      },
    );
    this.wallet = new Wallet(
      this.prodEnv
        ? env.NFTS_MOONBEAM_MAINNET_PRIVATEKEY
        : env.NFTS_MOONBEAM_TESTNET_PRIVATEKEY,
      this.provider,
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
      contract,
      uri,
      this.provider,
      nonce,
    );
  }

  async createMintToTransaction(
    contract: string,
    address: string,
    nonce: number,
  ) {
    return NftTransaction.createMintToTransaction(
      contract,
      address,
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

  async isTransacionConfirmed(txHash: string): Promise<boolean> {
    const tx: TransactionReceipt = await this.provider.getTransactionReceipt(
      txHash,
    );
    console.log(
      `Transaction receipt (txHash=${txHash}): ${JSON.stringify(tx)}`,
    );
    if (tx) {
      return !!(tx.confirmations > 1 && tx.blockNumber);
    }
    return false;
  }

  async getContractOwner(contractAddress: string) {
    const nftContract: Contract = new Contract(contractAddress, PayableNft.abi);
    return await nftContract.callStatic.owner();
  }
}
