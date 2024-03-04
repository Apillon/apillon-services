import { Wallet } from '../wallet/wallet.model';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { isTransactionIndexed } from '../blockchain-indexers/substrate/helpers';
import '@polkadot/api-augment';
import '@polkadot/rpc-augment';
import '@polkadot/types-augment';
import { SubmittableExtrinsic } from '@polkadot/api/types';

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

  async getUnsignedTransaction(
    transaction: string,
  ): Promise<SubmittableExtrinsic<'promise', any>> {
    console.log('Timing before unsigned transaction', this.getTiming(), 's');
    return (await this.getApi()).tx(transaction);
  }

  async send(rawTransaction: string): Promise<any> {
    console.log('Timing before send', this.getTiming(), 's');
    // return (await this.getApi()).tx(rawTransaction).send();
    return await new Promise(async (resolve, reject) => {
      try {
        const api = await this.getApi();
        await api.tx(rawTransaction).send((result) => {
          console.log('Got transaction send result:', result);
          if (result.status.isInBlock) {
            for (const e of result.events) {
              const {
                event: { method, section },
              } = e;
              if (section === 'system' && method === 'ExtrinsicFailed') {
                return reject(result);
              }
            }
            return resolve(result);
          }
          if (result.isError) {
            return reject(result);
          }
        });
      } catch (e: unknown) {
        reject(e);
      }
    });
  }

  /**
   * Tries to self repair nonce based on last on-chain nonce and indexer state.
   * @param wallet Wallet
   * @param transactionHash
   */
  async trySelfRepairNonce(wallet: Wallet, transactionHash: string) {
    console.log('Timing before self repair', this.getTiming(), 's');
    const api = await this.getApi();
    const accountInfo = await api.query.system.account(wallet.address);
    const nextOnChainNonce = accountInfo.nonce.toNumber();
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
        options['types'] = this.typesBundle;
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
