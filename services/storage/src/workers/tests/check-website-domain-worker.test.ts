import {
  QueueWorkerType,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { v4 as uuidV4 } from 'uuid';
import { Stage, releaseStage, setupTest } from '../../../test/setup';
import { BucketType, WebsiteDomainStatus } from '../../config/types';
import { Bucket } from '../../modules/bucket/models/bucket.model';
import { Website } from '../../modules/hosting/models/website.model';
import { CheckWebsiteDomainWorker } from '../check-website-domain-worker';

describe('CheckWebsiteDomainWorker integration test', () => {
  let stage: Stage;

  let worker: CheckWebsiteDomainWorker;
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
      'test-check-website-domain-worker',
      { parameters: { batchLimit } },
    );
    worker = new CheckWebsiteDomainWorker(
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
        domain: 'nino.ninja',
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
        domainLastCheckDate: new Date(),
        domainStatus: WebsiteDomainStatus.OK,
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
        name: 'Website without domain',
      },
      stage.context,
    ).insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Test check website domain', async () => {
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
    expect(tmpwebsite.domainLastCheckDate).toBeTruthy();
    expect(tmpwebsite.domainStatus).toBe(WebsiteDomainStatus.OK);

    //Test websites with invalid domains
    tmpwebsite = await new Website({}, stage.context).populateById(website2.id);
    expect(tmpwebsite.domainLastCheckDate).toBeTruthy();
    expect(tmpwebsite.domainStatus).toBe(WebsiteDomainStatus.INVALID);

    tmpwebsite = await new Website({}, stage.context).populateById(website3.id);
    expect(tmpwebsite.domainLastCheckDate).toBeTruthy();
    expect(tmpwebsite.domainStatus).toBe(WebsiteDomainStatus.INVALID);
  });

  test('Another run of planner should not return records', async () => {
    const data = await worker.runPlanner();
    expect(data.length).toBe(0);
  });

  test('Websites with updated domain in last 6 hours, should be checked in every interval', async () => {
    website.domainChangeDate = new Date();
    await website.update();

    const data = await worker.runPlanner();
    expect(data.length).toBe(1);
    expect(data[0].length).toBe(1);
  });
});
