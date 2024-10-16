import { ServiceContext } from '@apillon/service-lib';
import { Lmas, MySql } from '@apillon/lib';
import {
  AnyChain,
  AssetAmount,
  ConfigService,
} from '@galacticcouncil/xcm-core';
import {
  assetsMap,
  chainsConfigMap,
  chainsMap,
} from '@galacticcouncil/xcm-cfg';
import { HydraWalletExtended } from '../clients/hydra-wallet.client';
import { ApiPromise } from '@polkadot/api';
import { BigNumber, PoolService, TradeRouter } from '@galacticcouncil/sdk';

export abstract class ServiceWithContext {
  protected readonly context: ServiceContext;
  protected mysql: MySql;
  protected logging: Lmas;

  protected constructor(context: ServiceContext, logging: Lmas) {
    this.context = context;
    this.mysql = context.mysql;
    this.logging = logging;
  }
}

export abstract class AssetManagementBaseService extends ServiceWithContext {
  protected readonly configService: ConfigService;
  protected readonly hydraWallet: HydraWalletExtended;

  protected constructor(context: ServiceContext, logging: Lmas) {
    super(context, logging);

    this.configService = new ConfigService({
      assets: assetsMap,
      chains: chainsMap,
      chainsConfig: chainsConfigMap,
    });

    this.hydraWallet = new HydraWalletExtended({
      config: this.configService,
    });
  }

  async getTokenBalance(balances: AssetAmount[], token: string) {
    const swapToTokenBalance = balances.find(
      (balance) => balance.key === token.toLowerCase(),
    );
    if (!swapToTokenBalance) {
      throw Error(`token ${token} not found`);
    }

    return swapToTokenBalance;
  }

  async getTradeTx(
    api: ApiPromise,
    amountIn: number,
    assetIdIn: string,
    assetIdOut: string,
  ) {
    const poolService = new PoolService(api);
    const tradeRouter = new TradeRouter(poolService);
    const trade = await tradeRouter.getBestSell(
      assetIdIn,
      assetIdOut,
      amountIn,
    );
    const swapTx = trade.toTx(BigNumber('0'));
    const tx = api.tx(swapTx.hex);

    return { trade: trade, tx };
  }

  async getTransferTx(
    api: ApiPromise,
    destChain: AnyChain,
    destAddress: string,
    amountOut: BigNumber,
    tokenId: string,
    srcAddress: string,
  ) {
    const asset = this.configService.getAsset(tokenId);
    const srcChain = this.configService.getChain('hydradx');
    const xTransfer = await this.hydraWallet.transfer(
      asset,
      srcAddress,
      srcChain,
      destAddress,
      destChain,
    );
    const call = await xTransfer.buildCall(amountOut.toString());

    return api.tx(call.data);
  }
}
