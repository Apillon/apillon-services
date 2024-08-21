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
import { ResolveWebsiteDomainWorker } from '../resolve-website-domain-worker';
import { Website } from '../../modules/hosting/models/website.model';
import { BucketType, WebsiteDomainStatus } from '../../config/types';
import exp from 'constants';

describe('ResolveWebsiteDomainWorker integration test', () => {
  let stage: Stage;

  let worker: ResolveWebsiteDomainWorker;
  const batchLimit = 200;
  let website: Website;
  let website2: Website;
  let website3: Website;
  let project_uuid = uuidV4();

  beforeAll(async () => {
    stage = await setupTest();

    const workerDefinition = new WorkerDefinition(
      {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      },
      'test-resolve-website-domain-worker',
      { parameters: { batchLimit } },
    );
    worker = new ResolveWebsiteDomainWorker(
      workerDefinition,
      stage.context,
      QueueWorkerType.PLANNER,
    );

    const bucket = await new Bucket({}, stage.context)
      .fake()
      .populate({ name: 'Bucket', bucketType: BucketType.HOSTING })
      .insert();
    const stgBucket = await new Bucket({}, stage.context)
      .fake()
      .populate({ name: 'Staging bucket', bucketType: BucketType.HOSTING })
      .insert();
    const prodBucket = await new Bucket({}, stage.context)
      .fake()
      .populate({ name: 'Production bucket', bucketType: BucketType.HOSTING })
      .insert();

    //Insert data
    website = await new Website(
      {
        website_uuid: uuidV4(),
        project_uuid,
        bucket_id: bucket.id,
        stagingBucket_id: stgBucket.id,
        productionBucket_id: prodBucket.id,
        name: 'Website 1',
        domain: 'apillon.io',
      },
      stage.context,
    ).insert();

    website2 = await new Website(
      {
        website_uuid: uuidV4(),
        project_uuid,
        bucket_id: bucket.id,
        stagingBucket_id: stgBucket.id,
        productionBucket_id: prodBucket.id,
        name: 'Invalid',
        domain: 'some.invalid.domain',
      },
      stage.context,
    ).insert();

    website3 = await new Website(
      {
        website_uuid: uuidV4(),
        project_uuid,
        bucket_id: bucket.id,
        stagingBucket_id: stgBucket.id,
        productionBucket_id: prodBucket.id,
        name: 'Website with valid domain, but does not point to valid IPs',
        domain: 'app.apillon.io',
      },
      stage.context,
    ).insert();

    await new Website(
      {
        website_uuid: uuidV4(),
        project_uuid,
        bucket_id: bucket.id,
        stagingBucket_id: stgBucket.id,
        productionBucket_id: prodBucket.id,
        name: 'Already resolved website',
        domain: 'test.io',
        domainLastResolveDate: new Date(),
        domainStatus: WebsiteDomainStatus.RESOLVED,
      },
      stage.context,
    ).insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Test resolve website domain', async () => {
    const data = await worker.runPlanner();
    expect(data.length).toBe(1);
    expect(data[0].length).toBe(3);

    const tmpItem = data[0][0];

    expect(tmpItem.id).toBeTruthy();
    expect(tmpItem.domain).toBeTruthy();

    await worker.runExecutor(data[0]);

    //Test website apillon.io
    let tmpwebsite = await new Website({}, stage.context).populateById(
      website.id,
    );
    expect(tmpwebsite.domainLastResolveDate).toBeTruthy();
    expect(tmpwebsite.domainStatus).toBe(WebsiteDomainStatus.RESOLVED);

    //Test websites with invalid domains
    tmpwebsite = await new Website({}, stage.context).populateById(website2.id);
    expect(tmpwebsite.domainLastResolveDate).toBeTruthy();
    expect(tmpwebsite.domainStatus).toBe(WebsiteDomainStatus.UNRESOLVED);

    tmpwebsite = await new Website({}, stage.context).populateById(website3.id);
    expect(tmpwebsite.domainLastResolveDate).toBeTruthy();
    expect(tmpwebsite.domainStatus).toBe(WebsiteDomainStatus.UNRESOLVED);
  });

  test('Another run of planner should not return records', async () => {
    const data = await worker.runPlanner();
    expect(data.length).toBe(0);
  });
});
