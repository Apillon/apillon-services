import { releaseStage, setupTest, Stage } from '../../../test/setup';
import { PolkadotSignerService } from './polkadot-signer.service';

describe('Polkadot signer unit test', () => {
  let stage: Stage;

  beforeAll(async () => {
    stage = await setupTest();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Test service', async () => {
    const res = await PolkadotSignerService.signTransaction(
      null,
      stage.context,
    );
    console.log(res);
  });
});
