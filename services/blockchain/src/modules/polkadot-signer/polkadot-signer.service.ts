import { ServiceContext } from '../../context';
import { ApiPromise } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { Wallet } from './models/wallet';
import { Chain } from '@apillon/lib';

export class PolkadotSignerService {
  static async signTransaction(_event: any, context: ServiceContext) {
    // const api = await ApiPromise.create();
    const wallet = await new Wallet({}, context).populateByLeastUsed(
      Chain.CRUST,
    );
    const keyring = new Keyring();
    const pair = keyring.addFromUri(wallet.seed);
    console.log(pair.address);
    console.log(wallet.address);
  }
  //#region
}
