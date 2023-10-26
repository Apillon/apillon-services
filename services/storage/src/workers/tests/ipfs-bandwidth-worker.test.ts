import { ServiceDefinitionType, WorkerDefinition } from '@apillon/workers-lib';
import { Stage, releaseStage, setupTest } from '../../../test/setup';
import { IpfsBandwidthWorker } from '../ipfs-bandwidth-worker';
import { MongoCollections } from '@apillon/lib';
import { v4 as uuidV4 } from 'uuid';
import { IpfsBandwidth } from '../../modules/ipfs/models/ipfs-bandwidth';
import { DbTables } from '../../config/types';
import { Website } from '../../modules/hosting/models/website.model';

describe('IpfsBandwidthWorker integration test', () => {
  let stage: Stage;

  let ipfsBandwidthWorker: IpfsBandwidthWorker;
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

    const ipfsBandwidthWorkerDefinition = new WorkerDefinition(
      {
        type: ServiceDefinitionType.LAMBDA,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      },
      'test-ipfs-bandwidth-worker',
      { parameters: {} },
    );
    ipfsBandwidthWorker = new IpfsBandwidthWorker(
      ipfsBandwidthWorkerDefinition,
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

  test('Ipfs bandwidth worker should create ipfsBandwidth record for project, month and year. ', async () => {
    await ipfsBandwidthWorker.run();

    const ipfsBandwidth: IpfsBandwidth = await new IpfsBandwidth(
      {},
      stage.context,
    ).populateByProjectAndDate(
      project_uuid,
      new Date().getMonth() + 1,
      new Date().getFullYear(),
    );
    expect(ipfsBandwidth.exists()).toBe(true);
    expect(ipfsBandwidth.bandwidth).toBe(7000);
  });

  test('Ipfs bandwidth worker should create ipfsBandwidthSync record', async () => {
    const tmpQueryData = await stage.context.mysql.paramExecute(
      `
        SELECT * 
        FROM \`${DbTables.IPFS_BANDWIDTH_SYNC}\`
        ORDER BY ipfsTrafficTo DESC
        LIMIT 1
        `,
      {},
    );
    expect(tmpQueryData.length).toBeGreaterThan(0);
    expect(tmpQueryData[0].ipfsTrafficTo).toBeTruthy();
    expect(tmpQueryData[0].ipfsTrafficFrom).toBeTruthy();
  });

  test('Ipfs bandwidth worker should add bandwidth to existing ipfsBandwidth record for project, month and year. ', async () => {
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

    await ipfsBandwidthWorker.run();

    const ipfsBandwidth: IpfsBandwidth = await new IpfsBandwidth(
      {},
      stage.context,
    ).populateByProjectAndDate(
      project_uuid,
      new Date().getMonth() + 1,
      new Date().getFullYear(),
    );
    expect(ipfsBandwidth.exists()).toBe(true);
    expect(ipfsBandwidth.bandwidth).toBe(12000);
  });

  test('Ipfs bandwidth worker should account bandwidth based on host - website traffic', async () => {
    const ipfsBandwidth: IpfsBandwidth = await new IpfsBandwidth(
      {},
      stage.context,
    ).populateByProjectAndDate(
      testWebsite.project_uuid,
      new Date().getMonth() + 1,
      new Date().getFullYear(),
    );
    expect(ipfsBandwidth.exists()).toBe(true);
    expect(ipfsBandwidth.bandwidth).toBe(2700);
  });
});
