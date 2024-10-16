import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../../context';
import {
  AssetManagementMicroservice,
  BaseQueryFilter,
  BlockchainMicroservice,
  CreateMultisigWalletRequestDto,
  TransmitMultiSigRequest,
  UpdateTransactionDto,
  WalletDepositsQueryFilter,
  WalletRefillTransactionQueryFilter,
  WalletTransactionsQueryFilter,
} from '@apillon/lib';
import { RefillWalletDto } from '@apillon/blockchain-lib/common';

@Injectable()
export class BlockchainService {
  /**
   * Retrieves a list of all wallets filtered by query
   * @param {DevConsoleApiContext} context - The API context with current user session.
   * @param filter
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
   * @param query
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
   * List wallet deposits
   * @param context
   * @param query query parameters (tsFrom, tsTo, ...)
   * @param walletId
   * @returns
   */
  async listWalletDeposits(
    context: DevConsoleApiContext,
    query: WalletDepositsQueryFilter,
    walletId: number,
  ): Promise<any[]> {
    query.populate({ walletId });
    return (await new BlockchainMicroservice(context).listWalletDeposits(query))
      .data;
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

  async refillWallet(context: DevConsoleApiContext, body: RefillWalletDto) {
    return (await new AssetManagementMicroservice(context).refillWallet(body))
      .data;
  }

  // TODO: remove methods bellow after testing
  async listWalletRefillTransactions(
    context: DevConsoleApiContext,
    body: WalletRefillTransactionQueryFilter,
  ) {
    return (
      await new AssetManagementMicroservice(
        context,
      ).listWalletRefillTransactions(body)
    ).data;
  }

  async createMultisigWallet(
    context: DevConsoleApiContext,
    body: CreateMultisigWalletRequestDto,
  ) {
    const data = new CreateMultisigWalletRequestDto({}, context).populate(body);
    return (
      await new BlockchainMicroservice(context).createMultisigWallet(data)
    ).data;
  }

  async listMultisigWallets(
    context: DevConsoleApiContext,
    body: BaseQueryFilter,
  ) {
    const filter = new BaseQueryFilter({}, context).populate(body);
    return (
      await new BlockchainMicroservice(context).listMultisigWallets(filter)
    ).data;
  }

  async getMultisigWallet(context: DevConsoleApiContext, walletId: number) {
    return (
      await new BlockchainMicroservice(context).getMultisigWallet(walletId)
    ).data;
  }

  async transmitMultiSigTransaction(
    context: DevConsoleApiContext,
    body: TransmitMultiSigRequest,
  ) {
    const transactionData = new TransmitMultiSigRequest({}, context).populate(
      body,
    );
    return (
      await new BlockchainMicroservice(context).transmitMultiSigTransaction(
        transactionData,
      )
    ).data;
  }

  async cancelMultiSigTransaction(
    context: DevConsoleApiContext,
    body: TransmitMultiSigRequest,
  ) {
    const transactionData = new TransmitMultiSigRequest({}, context).populate(
      body,
    );
    return (
      await new BlockchainMicroservice(context).cancelMultiSigTransaction(
        transactionData,
      )
    ).data;
  }
}
