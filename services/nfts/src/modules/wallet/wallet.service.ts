import { AppEnvironment, EvmChain, MintNftDTO, env } from '@apillon/lib';
import { Contract, ethers, UnsignedTransaction, Wallet } from 'ethers';
import { NftTransaction } from '../../lib/nft-contract-transaction';
import { TransactionReceipt } from '@ethersproject/providers';
import { Collection } from '../nfts/models/collection.model';
import { EvmNftABI } from '../../lib/contracts/deployed-nft-contract';
import {
  EvmRpcEndpoint,
  EvmRpcEndpoints,
} from '../../lib/utils/evm-rpc-endpoint';

export class WalletService {
  private readonly provider: ethers.providers.JsonRpcProvider;
  private readonly evmChain: EvmChain;

  constructor(chain: EvmChain) {
    this.evmChain = chain;
    const evmRpc: EvmRpcEndpoint = EvmRpcEndpoints.get(chain);

    if (!evmRpc) {
      throw new Error('Missing RPC endpoint!');
    }
    console.log(chain);
    console.log(env.NFTS_MOONBEAM_TESTNET_RPC);
    this.provider = new ethers.providers.JsonRpcProvider(evmRpc.rpcUrl);

    console.log(`RPC initialization ${evmRpc.rpcUrl}`);
  }

  async createDeployTransaction(
    params: Collection,
  ): Promise<UnsignedTransaction> {
    return await NftTransaction.createDeployContractTransaction(params);
  }

  async createTransferOwnershipTransaction(
    contract: string,
    newOwner: string,
  ): Promise<UnsignedTransaction> {
    return await NftTransaction.createTransferOwnershipTransaction(
      this.evmChain,
      contract,
      newOwner,
    );
  }

  async createSetNftBaseUriTransaction(
    contract: string,
    uri: string,
  ): Promise<UnsignedTransaction> {
    return await NftTransaction.createSetNftBaseUriTransaction(
      this.evmChain,
      contract,
      uri,
    );
  }

  async createMintToTransaction(
    contract: string,
    params: MintNftDTO,
  ): Promise<UnsignedTransaction> {
    return await NftTransaction.createMintToTransaction(
      this.evmChain,
      contract,
      params,
    );
  }

  async createBurnNftTransaction(
    contract: string,
    tokenId: number,
  ): Promise<UnsignedTransaction> {
    return await NftTransaction.createBurnNftTransaction(
      this.evmChain,
      contract,
      tokenId,
    );
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
      EvmNftABI,
      this.provider,
    );
    return await nftContract.owner();
  }

  async getNumberOfMintedNfts(contractAddress: string): Promise<number> {
    const nftContract: Contract = new Contract(
      contractAddress,
      EvmNftABI,
      this.provider,
    );
    const totalSupply = await nftContract.totalSupply();
    return parseInt(totalSupply._hex, 16);
  }
}
