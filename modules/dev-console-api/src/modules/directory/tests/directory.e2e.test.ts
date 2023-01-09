import { DefaultUserRole, env, SqlModelStatus } from '@apillon/lib';
import { Bucket } from '@apillon/storage/src/modules/bucket/models/bucket.model';
import { Directory } from '@apillon/storage/src/modules/directory/models/directory.model';
import {
  createTestBucket,
  createTestBucketDirectory,
  createTestProject,
  createTestUser,
  TestUser,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { releaseStage, Stage } from '@apillon/tests-lib';
import { Project } from '../../project/models/project.model';
import { setupTest } from '../../../../test/helpers/setup';

describe('Storage directory tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testUser2: TestUser;
  let testUser3: TestUser;

  let testProject: Project;

  let testBucket: Bucket;
  let testDirectory: Directory;
  let testDirectory2: Directory;

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testUser2 = await createTestUser(stage.devConsoleContext, stage.amsContext);

    testProject = await createTestProject(testUser, stage.devConsoleContext);

    testBucket = await createTestBucket(
      testUser,
      stage.storageContext,
      testProject,
    );

    testDirectory = await createTestBucketDirectory(
      stage.storageContext,
      testProject,
      testBucket,
      true,
      undefined,
      'My directory',
      'test',
    );
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Get directory content tests', () => {
    test('User should be able to get bucket content', async () => {
      const response = await request(stage.http)
        .get(
          `/directories/directory-content?bucket_uuid=${testBucket.bucket_uuid}`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0]?.type).toBe('directory');
      expect(response.body.data.items[0]?.name).toBe(testDirectory.name);
    });

    test('User should be able to get directory content', async () => {
      const response = await request(stage.http)
        .get(
          `/directories/directory-content?bucket_uuid=${testBucket.bucket_uuid}&directory_id=${testDirectory.id}`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(2);
      expect(response.body.data.items[0]?.type).toBe('file');
      expect(response.body.data.items[0]?.name).toBeTruthy();
      expect(response.body.data.items[0]?.contentType).toBeTruthy();
      expect(response.body.data.items[0]?.size).toBeTruthy();
    });

    test('User should NOT be able to get ANOTHER USER bucket content', async () => {
      const response = await request(stage.http)
        .get(
          `/directories/directory-content?bucket_uuid=${testBucket.bucket_uuid}`,
        )
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });
  });

  describe('Directory CUD tests', () => {
    test('User should be able to create new directory', async () => {
      const response = await request(stage.http)
        .post(`/directories`)
        .send({
          bucket_id: testBucket.id,
          name: 'My test directory',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      expect(response.body.data.id).toBeTruthy();
      expect(response.body.data.directory_uuid).toBeTruthy();

      const d: Directory = await new Directory(
        {},
        stage.storageContext,
      ).populateById(response.body.data.id);
      expect(d.exists()).toBeTruthy();
      try {
        await d.validate();
      } catch (err) {
        await d.handle(err);
        expect(d.isValid()).toBeTruthy();
      }
    });

    test('User should NOT be able to create new directory if missing required data', async () => {
      const response = await request(stage.http)
        .post(`/directories`)
        .send({
          name: 'My test directory',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(422);
    });

    test('User should be able to update directory', async () => {
      const response = await request(stage.http)
        .patch(`/directories/${testDirectory.id}`)
        .send({
          name: 'Some new directory name',
          CID: 'some imaginary CID',
          description: 'my test description',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Some new directory name');

      const d: Directory = await new Directory(
        {},
        stage.storageContext,
      ).populateById(testDirectory.id);
      expect(d.exists()).toBeTruthy();
      try {
        await d.validate();
      } catch (err) {
        await d.handle(err);
        expect(d.isValid()).toBeTruthy();
      }
      expect(d.name).toBe('Some new directory name');
      expect(d.CID).toBe('some imaginary CID');
      expect(d.description).toBe('my test description');
    });

    test('User should NOT be able to delete ANOTHER USER directory', async () => {
      const response = await request(stage.http)
        .delete(`/directories/${testDirectory.id}`)
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);

      const d: Directory = await new Directory(
        {},
        stage.storageContext,
      ).populateById(testDirectory.id);
      expect(d.exists()).toBeTruthy();
    });

    test('User should be able to delete directory', async () => {
      const response = await request(stage.http)
        .delete(`/directories/${testDirectory.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      const d: Directory = await new Directory(
        {},
        stage.storageContext,
      ).populateById(response.body.data.id);
      expect(d.exists()).toBeFalsy();
    });
  });

  describe('Directory access tests', () => {
    beforeAll(async () => {
      //Insert new user with access to testProject as PROJECT_USER - can view, cannot modify
      testUser3 = await createTestUser(
        stage.devConsoleContext,
        stage.amsContext,
        DefaultUserRole.PROJECT_USER,
        SqlModelStatus.ACTIVE,
        testProject.project_uuid,
      );

      testDirectory2 = await createTestBucketDirectory(
        stage.storageContext,
        testProject,
        testBucket,
        true,
        undefined,
        'My 2. directory',
        'test',
      );
    });

    test('User with role "ProjectUser" should be able to get directory content', async () => {
      const response = await request(stage.http)
        .get(
          `/directories/directory-content?bucket_uuid=${testBucket.bucket_uuid}&directory_id=${testDirectory2.id}`,
        )
        .set('Authorization', `Bearer ${testUser3.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(2);
      expect(response.body.data.items[0]?.type).toBe('file');
    });

    //TODO! can user with role "ProjectUser" create/update/delete directory
  });
});
