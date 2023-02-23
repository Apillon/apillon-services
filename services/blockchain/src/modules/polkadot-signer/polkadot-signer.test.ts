import { Chain } from '@apillon/lib';
import Keyring from '@polkadot/keyring';
import {
  generateWallets,
  releaseStage,
  setupTest,
  Stage,
} from '../../../test/setup';
import { Endpoint } from './models/endpoint';
import { Wallet } from './models/wallet';
import { PolkadotSignerService } from './polkadot-signer.service';

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
    await new Endpoint(
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
      },
      stage.context,
    ).insert();
    const res = await PolkadotSignerService.signTransaction(
      null,
      stage.context,
    );
    console.log('res: ', res);
  });
});
