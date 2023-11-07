import {
  QueueWorkerType,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { Stage, releaseStage, setupTest } from '../../../test/setup';
import { Bucket } from '../../modules/bucket/models/bucket.model';
import { Ipns } from '../../modules/ipns/models/ipns.model';
import { RepublishIpnsWorker } from '../republish-ipns-worker';
import { IPFSService } from '../../modules/ipfs/ipfs.service';
import { SerializeFor, SqlModelStatus } from '@apillon/lib';
import { v4 as uuidV4 } from 'uuid';

describe('RepublishIpnsWorker integration test', () => {
  let stage: Stage;

  let republishWorker: RepublishIpnsWorker;
  const batchLimit = 200;
  let ipns: Ipns;
  let bucket: Bucket;

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

    //Insert data
    bucket = await new Bucket({}, stage.context)
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

  test('Test publish ipns', async () => {
    const publishedIpns = await new IPFSService(
      stage.context,
      ipns.project_uuid,
    ).publishToIPNS(
      'QmRwVSB8Bfr6E5hgw78j12mu8Sr8K8CAqJqpjyaCzSPLm5',
      `${ipns.project_uuid}_${ipns.bucket_id}_${ipns.id}`,
    );

    ipns.ipnsName = publishedIpns.name;
    ipns.ipnsValue = publishedIpns.value;
    ipns.key = `${ipns.project_uuid}_${ipns.bucket_id}_${ipns.id}`;
    ipns.cid = 'QmRwVSB8Bfr6E5hgw78j12mu8Sr8K8CAqJqpjyaCzSPLm5';
    ipns.status = SqlModelStatus.ACTIVE;

    await ipns.update(SerializeFor.UPDATE_DB);

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

  test('Test republish ipns worker with ipnses whoose key does not exists', async () => {
    await new Ipns({}, stage.context)
      .populate({
        project_uuid: bucket.project_uuid,
        bucket_id: bucket.id,
        name: 'test ipns 2',
        ipnsName: 'ipnsName',
        ipnsValue: '/ipfs/QmRwVSB8Bfr6E5hgw78j12mu8Sr8K8CAqJqpjyaCzSPLm5',
        key: uuidV4(), //Some test key, that does not exists on IPFS
        cid: 'QmRwVSB8Bfr6E5hgw78j12mu8Sr8K8CAqJqpjyaCzSPLm5',
      })
      .insert();

    const data = await republishWorker.runPlanner();
    await republishWorker.runExecutor(data[0]);
  });
});
