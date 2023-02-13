import { ServiceContext } from '../../context';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { Wallet } from './models/wallet';
import { Chain } from '@apillon/lib';
import { Endpoint } from './models/endpoint';

export class PolkadotSignerService {
  static async signTransaction(_event: any, context: ServiceContext) {
    const chain = Chain.CRUST;
    const endpoint = await new Endpoint({}, context).populateByChain(chain);
    console.log('endpoint: ', endpoint.url);
    const provider = new WsProvider(endpoint.url);
    const api = await ApiPromise.create({ provider });
    const wallet = await new Wallet({}, context).populateByLeastUsed(chain);

    let keyring;
    // if (chain == Chain.KILT) {
    //   keyring = new Keyring({ ss58Format: 38, type: 'sr25519' });
    // } else {
    // eslint-disable-next-line prefer-const
    keyring = new Keyring();
    // }

    const pair = keyring.addFromUri(wallet.seed);
    console.log(pair.address);

    const data = await api.query.system.account(pair.address);
    console.log(data['data']);
    console.log(data['data']['free'].toHuman());
  }
  //#region
}
