import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../../context';
import {
  BaseQueryFilter,
  BlockchainMicroservice,
  UpdateTransactionDto,
  WalletTransactionsQueryFilter,
} from '@apillon/lib';

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
   * Update a wallet by id and patch data
   * @async
   * @param {DevConsoleApiContext} context - - The API context with current user session.
   * @param {number} walletId - The wallet's id
   * @param {any} data - The wallet's update data
   * @returns {Promise<any>}
   */
  async updateWallet(
    context: DevConsoleApiContext,
    walletId: number,
    data: any,
  ): Promise<any> {
    return (
      await new BlockchainMicroservice(context).updateWallet(walletId, data)
    ).data;
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
    query: WalletTransactionsQueryFilter,
    walletId: number,
  ): Promise<any[]> {
    return (
      await new BlockchainMicroservice(context).getWalletTransactions(
        query,
        walletId,
      )
    ).data;
  }

  /**
   * Update a transaction by id and patch data
   * @async
   * @param {DevConsoleApiContext} context - - The API context with current user session.
   * @param {number} walletId - The wallet's id
   * @param {number} transactionId - The transaction's id
   * @param {UpdateTransactionDto} data - The transaction's update data
   * @returns {Promise<any>}
   */
  async updateTransaction(
    context: DevConsoleApiContext,
    walletId: number,
    transactionId: number,
    data: UpdateTransactionDto,
  ): Promise<any> {
    return (
      await new BlockchainMicroservice(context).updateTransaction(
        walletId,
        transactionId,
        data,
      )
    ).data;
  }
}
