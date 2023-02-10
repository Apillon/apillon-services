import { Chain } from '@apillon/lib';
import {
  generateWallets,
  releaseStage,
  setupTest,
  Stage,
} from '../../../test/setup';
import { Endpoint } from './models/endpoint';
import { PolkadotSignerService } from './polkadot-signer.service';

describe('Polkadot signer unit test', () => {
  let stage: Stage;

  beforeAll(async () => {
    stage = await setupTest();
    await generateWallets(1, Chain.CRUST, stage.context);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Test service', async () => {
    await new Endpoint(
      {
        url: 'wss://rpc.crust.network',
        chain: Chain.CRUST,
        status: 5,
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
