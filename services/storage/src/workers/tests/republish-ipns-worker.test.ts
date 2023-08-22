import {
  QueueWorkerType,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';

import { v4 as uuidV4 } from 'uuid';
import { Stage, releaseStage, setupTest } from '../../../test/setup';
import { Bucket } from '../../modules/bucket/models/bucket.model';
import { Ipns } from '../../modules/ipns/models/ipns.model';
import { RepublishIpnsWorker } from '../republish-ipns-worker';
import { PublishToIPNSWorker } from '../publish-to-ipns-worker';

describe('RepublishIpnsWorker unit test', () => {
  let stage: Stage;

  let republishWorker: RepublishIpnsWorker;
  let publishIpnsWorker: PublishToIPNSWorker;
  const batchLimit = 200;
  let ipns: Ipns;

  beforeAll(async () => {
    stage = await setupTest();

    const republishWorkerDefinition = new WorkerDefinition(
      {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      },
      'test-republish-ipns-worker',
      { parameters: { batchLimit } },
    );
    republishWorker = new RepublishIpnsWorker(
      republishWorkerDefinition,
      stage.context,
      QueueWorkerType.PLANNER,
    );

    const publishToIpnsWorkerDefinition = new WorkerDefinition(
      {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      },
      'test-publish-to-ipns-worker',
      { parameters: { batchLimit } },
    );
    publishIpnsWorker = new PublishToIPNSWorker(
      publishToIpnsWorkerDefinition,
      stage.context,
      QueueWorkerType.EXECUTOR,
    );

    //Insert data
    const bucket: Bucket = await new Bucket({}, stage.context)
      .fake()
      .populate({ name: 'Test bucket' })
      .insert();

    ipns = await new Ipns({}, stage.context)
      .populate({
        project_uuid: bucket.project_uuid,
        bucket_id: bucket.id,
        name: 'test ipns',
        cid: 'QmRwVSB8Bfr6E5hgw78j12mu8Sr8K8CAqJqpjyaCzSPLm5',
      })
      .insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Test publish ipns worker', async () => {
    await publishIpnsWorker.runExecutor({
      cid: ipns.cid,
      ipns_id: ipns.id,
    });

    ipns = await new Ipns({}, stage.context).populateById(ipns.id);
    expect(ipns.ipnsName).toBeTruthy();
    expect(ipns.ipnsValue).toBeTruthy();
    expect(ipns.key).toBeTruthy();
  });

  test('Test republish ipns worker', async () => {
    const data = await republishWorker.runPlanner();
    expect(data.length).toBe(1);
    expect(data[0].length).toBe(1);

    const ipnsData = data[0][0];

    expect(ipnsData.ipns).toBe(ipns.ipnsName);
    expect(ipnsData.cid).toBe(ipns.cid);
    expect(ipnsData.keyName).toBe(ipns.key);

    await republishWorker.runExecutor(data[0]);
  });
});
