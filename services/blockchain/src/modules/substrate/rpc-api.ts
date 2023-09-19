import { Wallet } from '../wallet/wallet.model';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { isTransactionIndexed } from '../blockchain-indexers/substrate/helpers';
import '@polkadot/api-augment';
import '@polkadot/rpc-augment';
import '@polkadot/types-augment';

export class SubstrateRpcApi {
  protected endpointUrl: string = null;
  protected apiPromise: ApiPromise = null;
  protected provider: WsProvider = null;
  protected typesBundle: any = null;
  protected started: Date = null;

  constructor(endpointUrl: string, typesBundle: any = null) {
    this.endpointUrl = endpointUrl;
    this.typesBundle = typesBundle;
    this.started = new Date();
  }

  async destroy() {
    if (this.provider) {
      await this.provider.disconnect();
      this.provider = null;
      this.apiPromise = null;
    }
    console.log('Timing after destroy', this.getTiming(), 's');
  }

  async getUnsignedTransaction(transaction: string) {
    console.log('Timing before unsigned transaction', this.getTiming(), 's');
    return (await this.getApi()).tx(transaction);
  }

  async send(rawTransaction: string) {
    console.log('Timing before send', this.getTiming(), 's');
    return (await this.getApi()).tx(rawTransaction).send();
  }

  /**
   * Tries to self repair nonce based on last on-chain nonce and indexer state.
   * @param wallet Wallet
   * @param transactionHash
   */
  async trySelfRepairNonce(wallet: Wallet, transactionHash: string) {
    console.log('Timing before self repair', this.getTiming(), 's');
    const nextOnChainNonce = (
      await (await this.getApi()).query.system.account(wallet.address)
    ).nonce.toNumber();
    if (!nextOnChainNonce) {
      return;
    }
    const lastProcessedNonce = nextOnChainNonce - 1;
    if (wallet.lastProcessedNonce > lastProcessedNonce) {
      return;
    }

    if (await isTransactionIndexed(wallet, transactionHash)) {
      return lastProcessedNonce;
    }
  }

  async getApi() {
    console.log('Timing before get API', this.getTiming(), 's');
    if (!this.provider) {
      this.provider = new WsProvider(this.endpointUrl);
      const options = {
        provider: this.provider,
        throwOnConnect: true,
      };
      if (this.typesBundle) {
        options['typesBundle'] = this.typesBundle;
      }
      this.apiPromise = await ApiPromise.create(options);
      console.log('Timing after first connect', this.getTiming(), 's');
      return this.apiPromise;
    } else {
      try {
        const health = await this.provider.send('system_health', null);
        console.log('Health check', health);
        console.log('Timing after health check', this.getTiming(), 's');
        return this.apiPromise;
      } catch (e) {
        console.error('Error after health check', e);
        this.apiPromise = await ApiPromise.create({
          provider: this.provider,
          typesBundle: this.typesBundle,
          throwOnConnect: true,
        });
        console.log('Timing after reconnect', this.getTiming(), 's');
        return this.apiPromise;
      }
    }
  }

  getTiming() {
    if (!this.started) {
      return null;
    }
    return (new Date().getTime() - this.started.getTime()) / 1000;
  }
}
