import { BaseQueryFilter } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { Wallet, WalletWithBalance } from '../../common/models/wallet';
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
  ): Promise<WalletWithBalance> {
    const wallet = await new Wallet({}, context).populateById(walletId);

    if (!wallet.exists()) {
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.WALLET_NOT_FOUND,
        status: 404,
      });
    }
    const { balance } = await wallet.checkBalance();
    // TODO: Round balance amount based on chain?
    return { ...wallet, balance } as WalletWithBalance;
  }

  static async getWalletTransactions(
    event: any,
    context: ServiceContext,
  ): Promise<any> {
    const wallet = await new Wallet({}, context).populateById(
      event.walletId as number,
    );
    if (!wallet.exists()) {
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.WALLET_NOT_FOUND,
        status: 404,
      });
    }

    return await new Wallet({}, context).getTransactions(
      wallet.address,
      new BaseQueryFilter(event),
    );
  }
}
