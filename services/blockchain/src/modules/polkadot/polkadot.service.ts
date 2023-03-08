import { ServiceContext } from '../../context';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { Wallet } from '../../common/models/wallet';
import { Chain } from '@apillon/lib';
import { Endpoint } from '../../common/models/endpoint';
import { typesBundleForPolkadot } from '@crustio/type-definitions';

export class PolkadotService {
  static async signTransaction(_event: any, context: ServiceContext) {
    const chain = Chain.CRUST;
    const endpoint = await new Endpoint({}, context).populateByChain(chain);
    console.log('endpoint: ', endpoint.url);
    const provider = new WsProvider(endpoint.url);
    const api = await ApiPromise.create({
      provider,
      typesBundle: typesBundleForPolkadot,
    });
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

    const tx = await api.tx.market.placeStorageOrder(
      'QmUQ6i2Njyktbtvb5vxnzynD9fTrAvYN1qYbSKjudCv8mB',
      7390,
      0,
      '',
    );

    const serialized = tx.toHex();

    const unsignedTx = api.tx(serialized);
    const info = await unsignedTx.paymentInfo(pair);
    console.log(`
      class=${info.class.toString()},
      weight=${info.weight.toString()},
      partialFee=${info.partialFee.toHuman()}
    `);
    const signed = await unsignedTx.signAsync(pair);
    console.log('Signed: ', signed);
    console.log('Signed: ', signed.toJSON());
    console.log('Signed: ', signed.toHex());

    const signedSerialized = signed.toHex();

    const signedTx = api.tx(signedSerialized);
    console.log('Signed: ', signedTx);
    console.log('Signed: ', signedTx.toJSON());
    console.log('Signed: ', signedTx.toHex());
    console.log('hash: ', signedTx.hash.toHuman());

    // await signedTx.send(({ status }) => {
    //   console.log(status);
    //   if (status.isInBlock) {
    //     console.log(`included in ${status.asInBlock}`);
    //   }
    // });
  }
  //#region
}
