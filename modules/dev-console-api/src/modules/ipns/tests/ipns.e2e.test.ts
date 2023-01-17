import { AmsErrorCode } from '@apillon/access/src/config/types';
import * as request from 'supertest';
import {
  createTestApiKey,
  createTestProject,
  createTestProjectService,
  createTestUser,
  TestUser,
  releaseStage,
  Stage,
  createTestBucket,
} from '@apillon/tests-lib';
import { Project } from '../../project/models/project.model';
import { Service } from '../../services/models/service.model';
import { ApiKey } from '@apillon/access/src/modules/api-key/models/api-key.model';
import { Ipns } from '@apillon/storage/src/modules/ipns/models/ipns.model';
import { ApiKeyRole } from '@apillon/access/src/modules/role/models/api-key-role.model';
import { setupTest } from '../../../../test/helpers/setup';
import { Bucket } from '@apillon/storage/src/modules/bucket/models/bucket.model';
import { BucketType } from '@apillon/storage/src/config/types';

describe('Ipns tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testProject: Project;
  let testBucket: Bucket;

  let testUser2: TestUser;
  let testProject2: Project;

  let ipnsRecord: any;

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testProject = await createTestProject(testUser, stage.devConsoleContext);
    testBucket = await createTestBucket(
      testUser,
      stage.storageContext,
      testProject,
      BucketType.STORAGE,
    );

    ipnsRecord = await new Ipns({}, stage.storageContext)
      .fake()
      .populate({
        project_uuid: testProject.project_uuid,
        bucket_id: testBucket.id,
      })
      .insert();

    testUser2 = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testProject2 = await createTestProject(testUser2, stage.devConsoleContext);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('User should be able to list ipns records inside bucket', async () => {
    const response = await request(stage.http)
      .get(`/buckets/${testBucket.id}/ipns`)
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(response.status).toBe(200);
    expect(response.body.data.items.length).toBe(1);
    expect(response.body.data.items[0].name).toBeTruthy();
  });

  test('User should NOT be able to list ipns records inside ANOTHER bucket', async () => {
    const response = await request(stage.http)
      .get(`/buckets/${testBucket.id}/ipns`)
      .set('Authorization', `Bearer ${testUser2.token}`);
    expect(response.status).toBe(403);
  });
});
