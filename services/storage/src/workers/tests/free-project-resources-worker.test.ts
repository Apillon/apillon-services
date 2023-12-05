import {
  QueueWorkerType,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { Stage, releaseStage, setupTest } from '../../../test/setup';
import { Defaults } from '../../config/types';
import { Bucket } from '../../modules/bucket/models/bucket.model';
import { File } from '../../modules/storage/models/file.model';
import { FreeProjectResourcesWorker } from '../free-project-resources-worker';

describe('Free project storage resources integration test', () => {
  let stage: Stage;

  let freeProjectResourcesWorker: FreeProjectResourcesWorker;

  let testBucket: Bucket;
  let testBucket2: Bucket;

  let testFile: File;

  beforeAll(async () => {
    stage = await setupTest();

    const workerDefinition = new WorkerDefinition(
      {
        type: ServiceDefinitionType.LAMBDA,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      },
      'test-free-project-resources-worker',
      { parameters: {} },
    );
    freeProjectResourcesWorker = new FreeProjectResourcesWorker(
      workerDefinition,
      stage.context,
      QueueWorkerType.EXECUTOR,
    );

    //#region Prepare test data

    //Buckets
    testBucket = await new Bucket({}, stage.context)
      .fake()
      .populate({ name: 'Test bucket 1' })
      .insert();

    testBucket2 = await new Bucket({}, stage.context)
      .fake()
      .populate({ name: 'Test bucket 2' })
      .insert();

    //Insert files

    //First bucket will have more than 10Gb of fake files
    //107374180 (0.1Gb --> Max size of files in bucket 1)
    while (testBucket.size < 4294967296) {
      const file = await new File({}, stage.context)
        .fake()
        .populate({
          name: `file ${testBucket.size}`,
          project_uuid: testBucket.project_uuid,
          bucket_id: testBucket.id,
          size: Math.floor(Math.random() * 107374180),
        })
        .insert();
      testBucket.size += file.size;
    }
    await setTimeout(() => {
      return;
    }, 5000);

    //Insert another file, which will have greater createDate
    testFile = await new File({}, stage.context)
      .fake()
      .populate({
        name: `file ${testBucket.size}`,
        project_uuid: testBucket.project_uuid,
        bucket_id: testBucket.id,
        size: Math.floor(Math.random() * 107374180),
      })
      .insert();
    testBucket.size += testFile.size;
    await testBucket.update();

    //Second less than 100 mb
    while (testBucket.size < 104857600) {
      const file = await new File({}, stage.context)
        .fake()
        .populate({
          name: `file ${testBucket2.size}`,
          project_uuid: testBucket2.project_uuid,
          bucket_id: testBucket.id,
          size: Math.floor(Math.random() * 52428800),
        })
        .insert();
      testBucket.size += file.size;
    }
    await testBucket2.update();

    //#endregion
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Worker should clear storage space of testBucket1 ', async () => {
    let usedStorage = await new Bucket(
      { project_uuid: testBucket.project_uuid },
      stage.context,
    ).getTotalSizeUsedByProject();
    expect(usedStorage).toBeGreaterThan(Defaults.DEFAULT_STORAGE_IN_BYTES);

    await freeProjectResourcesWorker.run({
      executeArg: JSON.stringify({
        project_uuid: testBucket.project_uuid,
        maxStorageQuota: Defaults.DEFAULT_STORAGE_IN_BYTES,
      }),
    });

    usedStorage = await new Bucket(
      { project_uuid: testBucket.project_uuid },
      stage.context,
    ).getTotalSizeUsedByProject();
    expect(usedStorage).toBeLessThan(Defaults.DEFAULT_STORAGE_IN_BYTES);
    //Check, that worker didn't delete too much files
    expect(usedStorage).toBeGreaterThanOrEqual(
      Defaults.DEFAULT_STORAGE_IN_BYTES - 107374180,
    );

    //Check that newer files still exists in bucket
    const file = await new File({}, stage.context).populateById(testFile.id);
    expect(file.exists()).toBeTruthy();
  });

  test('Worker should NOT delete content from buckets in project, that is not over storage quota ', async () => {
    const storageBeforeRun = await new Bucket(
      { project_uuid: testBucket2.project_uuid },
      stage.context,
    ).getTotalSizeUsedByProject();

    await freeProjectResourcesWorker.run({
      executeArg: JSON.stringify({
        project_uuid: testBucket2.project_uuid,
        maxStorageQuota: Defaults.DEFAULT_STORAGE_IN_BYTES,
      }),
    });

    const storageAfterRun = await new Bucket(
      { project_uuid: testBucket2.project_uuid },
      stage.context,
    ).getTotalSizeUsedByProject();
    expect(storageBeforeRun).toBe(storageAfterRun);
  });
});
