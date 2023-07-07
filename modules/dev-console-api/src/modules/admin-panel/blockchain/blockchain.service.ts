import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../../context';
import { BaseQueryFilter, BlockchainMicroservice } from '@apillon/lib';

@Injectable()
export class BlockchainService {
  /**
   * Retrieves a list of all wallets filtered by query
   * @param {DevConsoleApiContext} context - The API context with current user session.
   * @returns {Promise<any[]>} The array of wallets.
   */
  async getWalletList(
    context: DevConsoleApiContext,
    filter: BaseQueryFilter,
  ): Promise<any[]> {
    return (await new BlockchainMicroservice(context).listWallets(filter)).data;
  }

  /**
   * Retreive a wallet by its id
   * @async
   * @param {DevConsoleApiContext} context - - The API context with current user session.
   * @param {number} walletId - The wallet's id
   * @returns {Promise<any>}
   */
  async getWallet(
    context: DevConsoleApiContext,
    walletId: number,
  ): Promise<any> {
    return (await new BlockchainMicroservice(context).getWallet(walletId)).data;
  }

  /**
   * Retreives a list of all transactions for a wallet
   * @async
   * @param {DevConsoleApiContext} context
   * @param {number} walletId - The wallet's id
   * @returns {Promise<any[]>}
   */
  async getWalletTransactions(
    context: DevConsoleApiContext,
    walletId: number,
  ): Promise<any[]> {
    return await new BlockchainMicroservice(context).getWalletTransactions(
      walletId,
    );
  }
}
