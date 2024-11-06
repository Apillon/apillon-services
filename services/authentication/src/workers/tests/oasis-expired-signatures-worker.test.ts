import { BlockchainMicroservice, Scs, SqlModelStatus } from '@apillon/lib';
import { getConfig } from '@apillon/tests-lib';
import { ServiceDefinitionType, WorkerDefinition } from '@apillon/workers-lib';
import { Stage, releaseStage, setupTest } from '../../../test/setup';
import { OasisSignature } from '../../modules/embedded-wallet/models/oasis-signature.model';
import { OasisExpiredSignaturesWorker } from '../oasis-expired-signatures.worker';

describe('Oasis expired signature worker tests', () => {
  let stage: Stage;
  let config: any;

  let testSignature: OasisSignature;
  let testSignature2: OasisSignature;

  jest
    .spyOn(BlockchainMicroservice.prototype, 'getContract')
    .mockImplementation((contractId) => {
      return new Promise((resolve) => {
        resolve({
          id: contractId,
          lastParsedBlockTime: new Date(),
        });
      });
    });

  jest.spyOn(Scs.prototype, 'refundCredit').mockImplementation(() => {
    return new Promise((resolve) => {
      resolve(true);
    });
  });

  beforeAll(async () => {
    config = await getConfig();
    stage = await setupTest();

    //Insert test signatures with createTime set to past
    await stage.authApiContext.mysql.paramExecute(`
        INSERT INTO oasis_signature (id, project_uuid, dataHash, status, createTime)
        VALUES (1, 'test_project_uuid', 'some test hash', ${SqlModelStatus.INACTIVE}, '2024-05-01 10:00:00')
    `);

    testSignature = await new OasisSignature(
      {},
      stage.authApiContext,
    ).populateById(1);

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

  test('Test OasisExpiredSignaturesWorker worker', async () => {
    const workerDefinition = new WorkerDefinition(
      {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      },
      'oasis-expired-signatures-worker',
      {},
    );
    await new OasisExpiredSignaturesWorker(
      workerDefinition,
      stage.authApiContext,
    ).runExecutor({
      contractId: 1,
    });

    //Old signature, should be updated to status 100
    let tmpSignature = await new OasisSignature(
      {},
      stage.authApiContext,
    ).populateById(testSignature.id);
    expect(tmpSignature.status).toBe(100);

    //New, still valid should stay in INACTIVE status
    tmpSignature = await new OasisSignature(
      {},
      stage.authApiContext,
    ).populateById(testSignature2.id);
    expect(tmpSignature.status).toBe(SqlModelStatus.INACTIVE);
  });
});
