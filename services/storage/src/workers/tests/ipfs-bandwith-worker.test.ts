import { ServiceDefinitionType, WorkerDefinition } from '@apillon/workers-lib';
import { Stage, releaseStage, setupTest } from '../../../test/setup';
import { IpfsBandwithWorker } from '../ipfs-bandwith-worker';
import { MongoCollections } from '@apillon/lib';
import { v4 as uuidV4 } from 'uuid';

describe('IpfsBandwithWorker integration test', () => {
  let stage: Stage;

  let ipfsBandwithWorker: IpfsBandwithWorker;
  const testProject = uuidV4();

  beforeAll(async () => {
    stage = await setupTest();

    const ipfsBandwithWorkerDefinition = new WorkerDefinition(
      {
        type: ServiceDefinitionType.LAMBDA,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      },
      'test-ipfs-bandwith-worker',
      { parameters: {} },
    );
    ipfsBandwithWorker = new IpfsBandwithWorker(
      ipfsBandwithWorkerDefinition,
      stage.context,
    );

    const ipfsTrafficLogs = await stage.lmasMongo.db
      .collection(MongoCollections.IPFS_TRAFFIC_LOG)
      .insertMany([
        {
          node: 'IPFSTestNode',
          host: 'test.apillon.io',
          path: '/',
          project_uuid: null,
          cid: null,
          reqBytes: 233,
          respBytes: 651,
          responseTime: 2424,
          ts: new Date(),
        },
        {
          node: 'IPFSTestNode',
          host: 'test.apillon.io',
          path: '/home',
          project_uuid: null,
          cid: null,
          reqBytes: 233,
          respBytes: 5899998,
          responseTime: 3424,
          ts: new Date(),
        },
        {
          node: 'IPFSTestNode',
          host: 'ipfs-eu1.apillon.io',
          path: 'some ipfs path',
          project_uuid: testProject,
          cid: 'Qmek1ARHExdviRX8wpXRWT5WG9QQpDZjeAqnEFRcRhsY8X',
          reqBytes: 100,
          respBytes: 5000,
          responseTime: 42,
          ts: new Date(),
        },
        {
          node: 'IPFSTestNode',
          host: 'ipfs-eu1.apillon.io',
          path: 'some ipfs path 2',
          project_uuid: testProject,
          cid: 'Qmek1ARHExdviRX8wpXRWT5WG9QQpDZjeAqnEFRcRhsY8Y',
          reqBytes: 50,
          respBytes: 2000,
          responseTime: 100,
          ts: new Date(),
        },
      ]);
  });

  afterAll(async () => {
    //Delete ipfsTraffic logs from mongo
    await stage.lmasMongo.db
      .collection(MongoCollections.IPFS_TRAFFIC_LOG)
      .deleteMany({});
    await releaseStage(stage);
  });

  test('Test IpfsBandwithWorker', async () => {
    await ipfsBandwithWorker.run();
  });
});
