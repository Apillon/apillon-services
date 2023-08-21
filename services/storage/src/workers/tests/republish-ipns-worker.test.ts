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

describe('RepublishIpnsWorker unit test', () => {
  let stage: Stage;

  let worker: RepublishIpnsWorker;
  const batchLimit = 200;
  let ipns: Ipns;

  beforeAll(async () => {
    stage = await setupTest();

    const wd = new WorkerDefinition(
      {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      },
      'test-republish-ipns-worker',
      { parameters: { batchLimit } },
    );
    worker = new RepublishIpnsWorker(
      wd,
      stage.context,
      QueueWorkerType.PLANNER,
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
        name: 'ipns 1',
        ipnsName: 'k2k4r8m41xo9vdk5w6pxyoo59bknzpkm24x8khg8pfk9obcf9zg3f3gg',
        ipnsValue: '/ipfs/QmRwVSB8Bfr6E5hgw78j12mu8Sr8K8CAqJqpjyaCzSPLm5',
        key: uuidV4(),
        cid: 'QmRwVSB8Bfr6E5hgw78j12mu8Sr8K8CAqJqpjyaCzSPLm5',
      })
      .insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Test republish ipns worker', async () => {
    const data = await worker.runPlanner();
    expect(data.length).toBe(1);

    const ipnsData = data[0];

    expect(ipnsData.ipns).toBe(ipns.ipnsName);
    expect(ipnsData.cid).toBe(ipns.cid);
    expect(ipnsData.keyName).toBe(ipns.key);

    await worker.runExecutor(data);
  });
});
