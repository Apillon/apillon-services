import { ServiceContext } from '../../context';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { Wallet } from './models/wallet';
import { Chain } from '@apillon/lib';
import { Endpoint } from './models/endpoint';

export class PolkadotSignerService {
  static async signTransaction(_event: any, context: ServiceContext) {
    const enpoint = await new Endpoint({}, context).populateByChain(
      Chain.CRUST,
    );
    const provider = new WsProvider(enpoint.url);
    const api = await ApiPromise.create({ provider });
    const wallet = await new Wallet({}, context).populateByLeastUsed(
      Chain.CRUST,
    );
    const keyring = new Keyring();
    const pair = keyring.addFromUri(wallet.seed);
    console.log(pair.address);

    const data = await api.query.system.account(pair.address);
    console.log(data['data']['free'].toHuman());
  }
  //#region
}
