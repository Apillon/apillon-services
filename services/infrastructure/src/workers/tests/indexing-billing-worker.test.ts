import { ServiceDefinitionType, WorkerDefinition } from '@apillon/workers-lib';
import { v4 as uuidV4 } from 'uuid';
import { Stage, releaseStage, setupTest } from '../../../test/setup';
import { Indexer } from '../../modules/indexer/models/indexer.model';
import { IndexingBillingWorker } from '../indexing-billing-worker';
import { IndexerBilling } from '../../modules/indexer/models/indexer-billing.model';
import { CodeException, Scs, SqlModelStatus } from '@apillon/lib';

describe('Indexing billing worker integration test', () => {
  let stage: Stage;

  let worker: IndexingBillingWorker;

  let testIndexer: Indexer;

  let billedAmount = 0;

  beforeAll(async () => {
    stage = await setupTest();

    const workerDefinition = new WorkerDefinition(
      {
        type: ServiceDefinitionType.LAMBDA,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      },
      'test-indexing-billing-worker',
      { parameters: {} },
    );
    worker = new IndexingBillingWorker(workerDefinition, stage.context);

    testIndexer = await new Indexer({}, stage.context)
      .populate({
        indexer_uuid: uuidV4(),
        project_uuid: 'testProjectUuid',
        name: 'Test indexer',
        description: 'Test indexer description',
        squidId: 14071,
        squidReference: 'test-indexer@v1',
      })
      .insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Worker should get billing info from squid, account amount to indexer and spend credit', async () => {
    jest
      .spyOn(Scs.prototype, 'spendCredit')
      .mockImplementation((spendCredit) => {
        return new Promise((resolve) => {
          resolve(true);
        });
      });

    await worker.runExecutor();

    let indexerBilling = await new IndexerBilling(
      {},
      stage.context,
    ).populateByIndexerYearAndMonthForUpdate(
      testIndexer.id,
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      undefined,
    );

    expect(indexerBilling.exists()).toBeTruthy();
    expect(indexerBilling.billedAmount).toBeGreaterThan(0);
    billedAmount = indexerBilling.billedAmount;

    //Another run should not increase billed amount
    await worker.runExecutor();

    indexerBilling = await new IndexerBilling(
      {},
      stage.context,
    ).populateByIndexerYearAndMonthForUpdate(
      testIndexer.id,
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      undefined,
    );

    expect(billedAmount).toBe(indexerBilling.billedAmount);
  });

  test('Worker should put indexer into hibernate, if insufficient credits', async () => {
    jest.spyOn(Scs.prototype, 'spendCredit').mockImplementation(() => {
      return new Promise(() => {
        throw new CodeException({ code: 40210000, status: 402 });
      });
    });

    let indexerBilling = await new IndexerBilling(
      {},
      stage.context,
    ).populateByIndexerYearAndMonthForUpdate(
      testIndexer.id,
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      undefined,
    );
    //Reset billed amount
    indexerBilling.billedAmount = 0;
    await indexerBilling.update();

    await worker.runExecutor();

    indexerBilling = await new IndexerBilling(
      {},
      stage.context,
    ).populateByIndexerYearAndMonthForUpdate(
      testIndexer.id,
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      undefined,
    );

    expect(indexerBilling.billedAmount).toBe(0);

    const tmpIndexer = await new Indexer({}, stage.context).populateById(
      testIndexer.id,
    );
    expect(tmpIndexer.status).toBe(SqlModelStatus.INACTIVE);
  });
});
