import { ServiceDefinitionType, WorkerDefinition } from '@apillon/workers-lib';
import { Stage, releaseStage, setupTest } from '../../../test/setup';
import { IpfsBandwithWorker } from '../ipfs-bandwith-worker';
import { MongoCollections } from '@apillon/lib';
import { v4 as uuidV4 } from 'uuid';
import { IpfsBandwith } from '../../modules/ipfs/models/ipfs-bandwith';
import { DbTables } from '../../config/types';
import { Website } from '../../modules/hosting/models/website.model';

describe('IpfsBandwithWorker integration test', () => {
  let stage: Stage;

  let ipfsBandwithWorker: IpfsBandwithWorker;
  const project_uuid = uuidV4();

  let testWebsite: Website;

  beforeAll(async () => {
    stage = await setupTest();

    testWebsite = await new Website(
      {
        project_uuid: uuidV4(),
        name: 'Test website',
        domain: 'test.apillon.io',
      },
      stage.context,
    ).createNewWebsite(stage.context, uuidV4());

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

    await stage.lmasMongo.db
      .collection(MongoCollections.IPFS_TRAFFIC_LOG)
      .insertMany([
        {
          node: 'IPFSTestNode',
          host: testWebsite.domain,
          path: '/',
          project_uuid: null,
          cid: null,
          reqBytes: 233,
          respBytes: 1000,
          responseTime: 2424,
          ts: new Date(),
        },
        {
          node: 'IPFSTestNode',
          host: testWebsite.domain,
          path: '/home',
          project_uuid: null,
          cid: null,
          reqBytes: 233,
          respBytes: 1700,
          responseTime: 3424,
          ts: new Date(),
        },
        {
          node: 'IPFSTestNode',
          host: 'ipfs-eu1.apillon.io',
          path: 'some ipfs path',
          project_uuid: project_uuid,
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
          project_uuid: project_uuid,
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

  test('Ipfs bandwith worker should create ipfsBandwith record for project, month and year. ', async () => {
    await ipfsBandwithWorker.run();

    const ipfsBandwith: IpfsBandwith = await new IpfsBandwith(
      {},
      stage.context,
    ).populateByProjectAndDate(
      project_uuid,
      new Date().getMonth() + 1,
      new Date().getFullYear(),
    );
    expect(ipfsBandwith.exists()).toBe(true);
    expect(ipfsBandwith.bandwith).toBe(7000);
  });

  test('Ipfs bandwith worker should create ipfsBandwithSync record', async () => {
    const tmpQueryData = await stage.context.mysql.paramExecute(
      `
        SELECT * 
        FROM \`${DbTables.IPFS_BANDWITH_SYNC}\`
        ORDER BY ipfsTrafficTo DESC
        LIMIT 1
        `,
      {},
    );
    expect(tmpQueryData.length).toBeGreaterThan(0);
    expect(tmpQueryData[0].ipfsTrafficTo).toBeTruthy();
    expect(tmpQueryData[0].ipfsTrafficFrom).toBeTruthy();
  });

  test('Ipfs bandwith worker should add bandwith to existing ipfsBandwith record for project, month and year. ', async () => {
    await stage.lmasMongo.db
      .collection(MongoCollections.IPFS_TRAFFIC_LOG)
      .insertOne({
        node: 'IPFSTestNode',
        host: 'ipfs-eu1.apillon.io',
        path: 'some ipfs path',
        project_uuid: project_uuid,
        cid: 'Qmek1ARHExdviRX8wpXRWT5WG9QQpDZjeAqnEFRcRhsY8X',
        reqBytes: 100,
        respBytes: 5000,
        responseTime: 42,
        ts: new Date(),
      });

    await ipfsBandwithWorker.run();

    const ipfsBandwith: IpfsBandwith = await new IpfsBandwith(
      {},
      stage.context,
    ).populateByProjectAndDate(
      project_uuid,
      new Date().getMonth() + 1,
      new Date().getFullYear(),
    );
    expect(ipfsBandwith.exists()).toBe(true);
    expect(ipfsBandwith.bandwith).toBe(12000);
  });

  test('Ipfs bandwith worker should account bandwith based on host - website traffic', async () => {
    const ipfsBandwith: IpfsBandwith = await new IpfsBandwith(
      {},
      stage.context,
    ).populateByProjectAndDate(
      testWebsite.project_uuid,
      new Date().getMonth() + 1,
      new Date().getFullYear(),
    );
    expect(ipfsBandwith.exists()).toBe(true);
    expect(ipfsBandwith.bandwith).toBe(2700);
  });
});
