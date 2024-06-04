import {
  QueueWorkerType,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { TokenClaim } from '../../modules/airdrop/models/token-claim';
import { ClaimContractEventWorker } from '../claim-contract-event.worker';
import { Stage, releaseStage, setupTest } from '../../../test/setup';

describe('Claim contract event worker tests', () => {
  let stage: Stage;
  let tokenClaim: TokenClaim;
  let tokenClaim2: TokenClaim;

  beforeAll(async () => {
    stage = await setupTest();

    tokenClaim = await new TokenClaim({}, stage.context)
      .fake()
      .populate({ wallet: '0xD010621b92A0b7687f7276B4795C96F1B25A9AAB' })
      .insert();
    tokenClaim2 = await new TokenClaim({}, stage.context)
      .fake()
      .populate({ wallet: '0x345960380258653e69eD57c849399a98b51E2A63' })
      .insert();

    expect(tokenClaim.claimCompleted).toBeFalsy();
    expect(tokenClaim2.claimCompleted).toBeFalsy();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Test ClaimContractEventWorker worker', async () => {
    const workerDefinition = new WorkerDefinition(
      {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      },
      'claim-contract-event-worker',
      {},
    );
    await new ClaimContractEventWorker(
      workerDefinition,
      stage.context,
      QueueWorkerType.EXECUTOR,
    ).runExecutor({
      data: [
        '0xd010621B92A0b7687f7276B4795C96F1B25A9AAB',
        '0x345960380258653E69eD57C849399a98b51E2A63',
      ],
    });

    const updatedClaim = await new TokenClaim({}, stage.context).populateByUUID(
      tokenClaim.user_uuid,
      'user_uuid',
    );
    const updatedClaim2 = await new TokenClaim(
      {},
      stage.context,
    ).populateByUUID(tokenClaim2.user_uuid, 'user_uuid');
    expect(updatedClaim.claimCompleted).toBeTruthy();
    expect(updatedClaim2.claimCompleted).toBeTruthy();
  });
});
