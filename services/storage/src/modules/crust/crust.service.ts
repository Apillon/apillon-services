import { AppEnvironment, env } from '@apillon/lib';
import { typesBundleForPolkadot } from '@crustio/type-definitions';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { CID } from 'ipfs-http-client';
import { StorageErrorCode } from '../../config/types';
import { StorageCodeException } from '../../lib/exceptions';

export class CrustService {
  static async placeStorageOrderToCRUST(params: {
    cid: CID;
    size: number;
    isDirectory: boolean;
  }) {
    // Pin dist directory on Crust
    const api = new ApiPromise({
      provider: new WsProvider('wss://rpc.crust.network'),
      typesBundle: typesBundleForPolkadot,
    });

    // Construct place-storage-order tx
    const fileCid = params.cid; // IPFS CID, take `Qm123` as example
    const fileSize = params.size; // Let's say 2 gb(in byte)
    const tips = 0;
    const memo = params.isDirectory ? 'folder' : '';

    await api.isReady;

    const tx = api.tx.market.placeStorageOrder(fileCid, fileSize, tips, memo);

    //Load seeds(account)
    if (!env.STORAGE_CRUST_SEED_PHRASE) {
      throw new StorageCodeException({
        status: 500,
        code: StorageErrorCode.STORAGE_CRUST_SEED_NOT_SET,
        sourceFunction: `${this.constructor.name}/placeStorageOrderToCRUST`,
      });
    }

    const seeds =
      env.APP_ENV == AppEnvironment.LOCAL_DEV ||
      env.APP_ENV == AppEnvironment.TEST
        ? env.STORAGE_CRUST_SEED_PHRASE_TEST
        : env.STORAGE_CRUST_SEED_PHRASE;
    const kr = new Keyring({ type: 'sr25519' });
    const krp = kr.addFromUri(seeds);

    // Send transaction
    await api.isReadyOrError;
    return new Promise((resolve, reject) => {
      tx.signAndSend(krp, ({ events = [], status }) => {
        console.log(`💸  Tx status: ${status.type}, nonce: ${tx.nonce}`);
        console.log(`is in block: `, status.isInBlock);
        events.forEach(({ event }) => {
          console.log('event.method:', event.method);
          console.log('event.data', event.data);
          if (
            event.method === 'ExtrinsicSuccess' ||
            event.method === 'Finalized'
          ) {
            if (status.isInBlock) {
              console.log(`✅  Place storage order success!`);
              // Kill api connection - otherwise process won't exit
              void api.disconnect();
              resolve({ success: true });
            } else {
              void api.disconnect();
              reject(event.data);
            }
          } else if (event.method === 'ExtrinsicFailed') {
            // extract the data for this event
            const [dispatchError] = event.data;
            const errorInfo = dispatchError.toString();
            console.log(`Place storage order failed: ${errorInfo}`);
            void api.disconnect();
            reject(errorInfo);
          }
        });
      }).catch((e) => {
        void api.disconnect();
        reject(e);
      });
    });
  }

  static async getOrderStatus(params: { cid: string }) {
    // Pin dist directory on Crust
    const api = new ApiPromise({
      provider: new WsProvider('wss://rpc.crust.network'),
      typesBundle: typesBundleForPolkadot,
    });

    await api.isReadyOrError;
    const crustFileStatus = await api.query.market.filesV2(params.cid);
    await api.disconnect();
    return crustFileStatus;
  }
}
