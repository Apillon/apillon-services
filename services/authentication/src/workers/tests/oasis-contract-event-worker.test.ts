import { getConfig } from '@apillon/tests-lib';
import {
  QueueWorkerType,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { releaseStage, setupTest, Stage } from '../../../test/setup';
import { OasisSignature } from '../../modules/oasis/models/oasis-signature.model';
import { OasisContractEventWorker } from '../oasis-contract-event.worker';
import { SqlModelStatus } from '@apillon/lib';

describe('Oasis contract event worker webhook tests', () => {
  let stage: Stage;
  let config: any;

  let testSignature: OasisSignature;
  let testSignature2: OasisSignature;

  beforeAll(async () => {
    config = await getConfig();
    stage = await setupTest();

    //Insert test signatures
    testSignature = await new OasisSignature({}, stage.authApiContext)
      .populate({
        status: SqlModelStatus.INACTIVE,
        project_uuid: 'test project uuid',
        dataHash:
          '0xd63ffa37fb2bf11e51d88fb3ffea8ee22788d21538247da8e1a98f6d134e63b8',
      })
      .insert();

    testSignature2 = await new OasisSignature({}, stage.authApiContext)
      .populate({
        status: SqlModelStatus.INACTIVE,
        project_uuid: 'test project uuid',
        dataHash:
          '0x560e2aa96226c7c8b6345e7655d072c84ae0469c835bd9ab0d4899266315b4e5',
      })
      .insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Test OasisContractEventWorker worker', async () => {
    const workerDefinition = new WorkerDefinition(
      {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      },
      'oasis-contract-event-worker',
      {},
    );
    await new OasisContractEventWorker(
      workerDefinition,
      stage.authApiContext,
      QueueWorkerType.EXECUTOR,
    ).runExecutor({
      data: [
        '0xd63ffa37fb2bf11e51d88fb3ffea8ee22788d21538247da8e1a98f6d134e63b8',
      ],
    });

    let tmpSignature = await new OasisSignature(
      {},
      stage.authApiContext,
    ).populateById(testSignature.id);
    expect(tmpSignature.status).toBe(SqlModelStatus.ACTIVE);

    tmpSignature = await new OasisSignature(
      {},
      stage.authApiContext,
    ).populateById(testSignature2.id);
    expect(tmpSignature.status).toBe(SqlModelStatus.INACTIVE);
  });
});
