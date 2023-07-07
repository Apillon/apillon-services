import { BaseQueryFilter } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { Wallet } from '../../common/models/wallet';
import { BlockchainCodeException } from '../../lib/exceptions';
import { BlockchainErrorCode } from '../../config/types';

export class WalletService {
  static async listWallets(
    filter: BaseQueryFilter,
    context: ServiceContext,
  ): Promise<{ items: any[]; total: number }> {
    return await new Wallet({}, context).listWallets(filter);
  }

  static async getWallet(
    { walletId }: { walletId: number },
    context: ServiceContext,
  ): Promise<Wallet> {
    const wallet = await new Wallet({}, context).populateById(walletId);

    if (!wallet.exists()) {
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.WALLET_NOT_FOUND,
        status: 404,
      });
    }

    return wallet;
  }

  static async getWalletTransactions(): Promise<any[]> {
    return [];
  }
}
