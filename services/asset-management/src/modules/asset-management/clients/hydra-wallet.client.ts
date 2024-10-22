import { Wallet } from '@galacticcouncil/xcm-sdk';
import { AnyChain, AssetAmount } from '@galacticcouncil/xcm-core';

export class HydraWalletExtended extends Wallet {
  async getBalances(
    chain: AnyChain,
    srcAddress: string,
  ): Promise<AssetAmount[]> {
    return new Promise(async (resolve, reject) => {
      try {
        const balanceSubscription = await this.subscribeBalance(
          srcAddress,
          chain,
          (balances: AssetAmount[]) => {
            resolve(balances);
            balanceSubscription.unsubscribe();
          },
        );
      } catch (error) {
        reject(error);
      }
    });
  }
}
