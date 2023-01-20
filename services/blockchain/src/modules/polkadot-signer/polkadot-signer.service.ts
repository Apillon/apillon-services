import { v4 as uuidV4 } from 'uuid';
import { ServiceContext } from '../../context';
import { ApiPromise } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { mnemonicGenerate, mnemonicToMiniSecret } from '@polkadot/util-crypto';

export class PolkadotSignerService {
  static async signTransaction(_event: any, context: ServiceContext) {
    const api = await ApiPromise.create();
    const keyring = new Keyring({ type: 'sr25519' });
    const mnemonic = mnemonicGenerate();
    const mnemonicMini = mnemonicToMiniSecret(mnemonic);
    console.log(mnemonic);
    console.log(mnemonicMini);
  }
  //#region
}
