import {
  MongoCollections,
  SqlModelStatus,
  TransactionStatus,
  TransactionWebhookDataDto,
} from '@apillon/lib';
import {
  QueueWorkerType,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { v4 as uuidV4 } from 'uuid';
import { DbTables } from '../../config/types';
import { Stage, releaseStage, setupTest } from '../../../test/setup';
import { TransactionStatusWorker } from '../transaction-status-worker';
import { Space } from '../../modules/subsocial/models/space.model';
import { Post } from '../../modules/subsocial/models/post.model';

describe('Social TransactionStatusWorker integration test', () => {
  let stage: Stage;
  let testSpace: Space;
  let testPost: Post;
  let testSpace2: Space;

  let worker: TransactionStatusWorker;
  const project_uuid = uuidV4();

  beforeAll(async () => {
    stage = await setupTest();

    const workerDefinition = new WorkerDefinition(
      {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      },
      'test-transaction-status-worker',
      { parameters: {} },
    );
    worker = new TransactionStatusWorker(
      workerDefinition,
      stage.context,
      QueueWorkerType.EXECUTOR,
    );

    //insert test space
    testSpace = await new Space({}, stage.context)
      .fake()
      .populate({
        status: SqlModelStatus.DRAFT,
        project_uuid,
        about: 'Test space',
      })
      .insert();

    //Insert test post
    testPost = await new Post({}, stage.context)
      .fake()
      .populate({
        space_id: testSpace.id,
        status: SqlModelStatus.DRAFT,
        project_uuid,
      })
      .insert();

    testSpace2 = await new Space({}, stage.context)
      .populate({
        space_uuid: uuidV4(),
        name: 'Test space which should not be changed',
        status: SqlModelStatus.DRAFT,
        project_uuid,
        about: 'Test space 2',
      })
      .insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Transaction status worker should update space and post by tx reference and tx status recieved from BCS', async () => {
    const webhookData: TransactionWebhookDataDto[] = [
      new TransactionWebhookDataDto(
        {
          id: 1,
          transactionHash: 'space tx hash',
          referenceTable: DbTables.SPACE,
          referenceId: testSpace.space_uuid,
          transactionStatus: TransactionStatus.CONFIRMED,
          data: '1',
        },
        stage.context,
      ),
      new TransactionWebhookDataDto(
        {
          id: 2,
          transactionHash: 'post tx hash',
          referenceTable: DbTables.POST,
          referenceId: testPost.post_uuid,
          transactionStatus: TransactionStatus.CONFIRMED,
          data: '2',
        },
        stage.context,
      ),
    ];

    await worker.run({ executeArg: JSON.stringify({ data: webhookData }) });

    let tmpSpace = await new Space({}, stage.context).populateById(
      testSpace.id,
    );
    expect(tmpSpace.status).toBe(SqlModelStatus.ACTIVE);
    expect(tmpSpace.spaceId).toBe('1');

    const tmpPost = await new Post({}, stage.context).populateById(testPost.id);
    expect(tmpPost.status).toBe(SqlModelStatus.ACTIVE);
    expect(tmpPost.postId).toBe('2');

    //Other spaces and post should not be affected
    tmpSpace = await new Space({}, stage.context).populateById(testSpace2.id);
    expect(tmpSpace.status).toBe(SqlModelStatus.DRAFT);
  });

  test('Transaction status worker should update failed transactions', async () => {
    const webhookData: TransactionWebhookDataDto[] = [
      new TransactionWebhookDataDto(
        {
          id: 3,
          transactionHash: 'space tx hash',
          referenceTable: DbTables.SPACE,
          referenceId: testSpace2.space_uuid,
          transactionStatus: TransactionStatus.FAILED,
        },
        stage.context,
      ),
    ];

    await worker.run({ executeArg: JSON.stringify({ data: webhookData }) });

    const tmpSpace = await new Space({}, stage.context).populateById(
      testSpace2.id,
    );
    expect(tmpSpace.status).toBe(100);
  });
});
