import { typesBundleForPolkadot } from '@crustio/type-definitions';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { u8aToHex } from '@polkadot/util';
import { CID, create } from 'ipfs-http-client';

export class CrustService {
  static async createIPFSClient() {
    console.log('creating IPFS client...');
    const seed = process.env.STORAGE_CRUST_SEED_PHRASE;
    if (!seed) {
      throw new Error('seed phrase not found');
    }

    // 1.2 get a keypair
    const keyring = new Keyring();
    const pair = keyring.addFromUri(seed);

    // 1.3 get the signature of the addr
    const sigRaw = pair.sign(pair.address);
    const sig = u8aToHex(sigRaw);

    // 1.4 compile the sig to autHeader
    const authHeaderRaw = `sub-${pair.address}:${sig}`;
    const authHeader = Buffer.from(authHeaderRaw).toString('base64');

    const ipfs = create({
      url: `https://crustipfs.xyz/api/v0`,
      headers: {
        authorization: `Basic ${authHeader}`,
      },
    });

    console.log('IPFS client created...');

    return ipfs;
  }

  static async placeStorageOrderToCRUST(params: { cid: CID; size: number }) {
    // Pin dist directory on Crust
    const api = new ApiPromise({
      provider: new WsProvider('wss://rpc.crust.network'),
      typesBundle: typesBundleForPolkadot,
    });

    // Construct place-storage-order tx
    const fileCid = params.cid; // IPFS CID, take `Qm123` as example
    const fileSize = params.size; // Let's say 2 gb(in byte)
    const tips = 0;
    const memo = '';

    await api.isReady;

    const tx = api.tx.market.placeStorageOrder(fileCid, fileSize, tips, memo);

    // Load seeds(account)
    const seeds = process.env.STORAGE_CRUST_SEED_PHRASE;
    const kr = new Keyring({ type: 'sr25519' });
    const krp = kr.addFromUri(seeds);

    // Send transaction
    await api.isReadyOrError;
    return new Promise((resolve, reject) => {
      tx.signAndSend(krp, ({ events = [], status }) => {
        console.log(`💸  Tx status: ${status.type}, nonce: ${tx.nonce}`);
        if (status.isInBlock) {
          events.forEach(({ event: { method } }) => {
            if (method === 'ExtrinsicSuccess') {
              console.log(`✅  Place storage order success!`);
              // Kill api connection - otherwise process won't exit
              void api.disconnect();
              resolve({ success: true });
            }
          });
        }
      }).catch((e) => {
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
    return await api.query.market.filesV2(params.cid);
  }
}
