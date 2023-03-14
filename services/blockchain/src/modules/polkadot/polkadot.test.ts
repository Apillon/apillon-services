import { Chain } from '@apillon/lib';
import Keyring from '@polkadot/keyring';
import {
  generateWallets,
  releaseStage,
  setupTest,
  Stage,
} from '../../../test/setup';
import { Endpoint } from '../../common/models/endpoint';
import { Wallet } from '../../common/models/wallet';
import { PolkadotService } from './polkadot.service';
import { typesBundleForPolkadot } from '@crustio/type-definitions';
import { ApiPromise, WsProvider } from '@polkadot/api';

describe('Polkadot signer unit test', () => {
  let stage: Stage;

  beforeAll(async () => {
    stage = await setupTest();
    // await generateWallets(1, Chain.CRUST, stage.context);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Test service', async () => {
    const keyring = new Keyring({ ss58Format: 38, type: 'sr25519' });
    const keypair = keyring.createFromUri(
      'fine circle fiction good shop hand canal approve over canal border mixed',
    );

    console.log(keypair.address);
    const endpoint = await new Endpoint(
      {
        url: 'wss://rpc-rocky.crust.network',
        chain: Chain.CRUST,
        status: 5,
      },
      stage.context,
    ).insert();
    await new Endpoint(
      {
        url: 'wss://spiritnet.api.onfinality.io/ws?apikey=15a3df59-0a99-4216-97b4-e2d242fe64e5',
        chain: Chain.KILT,
        status: 5,
      },
      stage.context,
    ).insert();

    const provider = new WsProvider(endpoint.url);
    const api = await ApiPromise.create({
      provider,
      typesBundle: typesBundleForPolkadot,
    });

    const nonce = await api.rpc.system.accountNextIndex(
      '5DjjQpgetdaYUN6YyDGNguM1oMMDnNHnVPwgZDWuc29LswBi',
    );
    console.log('NONCE: ', nonce);
    await new Wallet(
      {
        chain: Chain.KILT,
        seed: 'fine circle fiction good shop hand canal approve over canal border mixed',
        address: '4q4EMLcCRKF1VgXgJgtcVu4CeVvwa6tsmBDQUKgNH9YUZRKq',
      },
      stage.context,
    ).insert();

    await new Wallet(
      {
        chain: Chain.CRUST,
        seed: 'fine circle fiction good shop hand canal approve over canal border mixed',
        address: '5DjjQpgetdaYUN6YyDGNguM1oMMDnNHnVPwgZDWuc29LswBi',
        nextNonce: nonce.toNumber(),
      },
      stage.context,
    ).insert();

    const tx = await api.tx.market.placeStorageOrder(
      'QmUQ6i2Njyktbtvb5vxnzynD9fTrAvYN1qYbSKjudCv8mB',
      7390,
      0,
      '',
    );
    const serialize = tx.toHex();
    console.log(serialize);

    const res = await PolkadotService.createTransaction(
      { transaction: serialize, chain: Chain.CRUST },
      stage.context,
    );
    // const id = 124392353;

    // PolkadotService.getTransactionStatus({ id }, stage.context);
    console.log('res: ', res);

    const res2 = await PolkadotService.transmitTransactions(
      { chain: Chain.CRUST },
      stage.context,
    );
    console.log('res2: ', res2);
  });
});
