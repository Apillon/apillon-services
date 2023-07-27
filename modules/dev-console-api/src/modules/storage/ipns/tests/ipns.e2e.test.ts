import { BucketType } from '@apillon/storage/src/config/types';
import { Bucket } from '@apillon/storage/src/modules/bucket/models/bucket.model';
import { Ipns } from '@apillon/storage/src/modules/ipns/models/ipns.model';
import {
  createTestBucket,
  createTestBucketFile,
  createTestProject,
  createTestUser,
  releaseStage,
  Stage,
  TestUser,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { setupTest } from '../../../../../test/helpers/setup';
import { Project } from '../../../project/models/project.model';
import { File } from '@apillon/storage/src/modules/storage/models/file.model';
import { DefaultUserRole, env, SqlModelStatus } from '@apillon/lib';

describe('Ipns tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testUser2: TestUser;
  let adminTestUser: TestUser;

  let testProject: Project;
  let testProject2: Project;

  let testBucket: Bucket;

  let ipnsRecord: any;

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    adminTestUser = await createTestUser(
      stage.devConsoleContext,
      stage.amsContext,
      DefaultUserRole.ADMIN,
    );
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

    console.info(
      'testProject2 is needed so that user has permisions. ',
      testProject2,
    );
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('IPNS CRU tests', () => {
    test('User should be able to list ipns records inside bucket', async () => {
      const response = await request(stage.http)
        .get(`/buckets/${testBucket.id}/ipns`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0].name).toBeTruthy();
    });

    test('User should recieve 422 if invalid body', async () => {
      const response = await request(stage.http)
        .post(`/buckets/${testBucket.id}/ipns`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(422);
      expect(response.body.errors.length).toBe(1);
      expect(response.body.errors.find((x) => x.code == 42200026)).toBeTruthy();
    });

    test('User should be able to create IPNS record', async () => {
      const response = await request(stage.http)
        .post(`/buckets/${testBucket.id}/ipns`)
        .send({ name: 'My new IPNS' })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      expect(response.body.data.id).toBeTruthy();
      expect(response.body.data.name).toBeTruthy();
      expect(response.body.data.status).toBe(SqlModelStatus.INCOMPLETE);

      const newIpns: Ipns = await new Ipns(
        {},
        stage.storageContext,
      ).populateById(response.body.data.id);
      expect(newIpns.exists()).toBeTruthy();
    });

    test('User should be able to update IPNS record', async () => {
      const response = await request(stage.http)
        .patch(`/buckets/${testBucket.id}/ipns/${ipnsRecord.id}`)
        .send({
          name: 'My updated IPNS record',
          description: 'This is new description',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.id).toBeTruthy();
      expect(response.body.data.name).toBe('My updated IPNS record');
      const updatedIpns: Ipns = await new Ipns(
        {},
        stage.storageContext,
      ).populateById(ipnsRecord.id);
      expect(updatedIpns.exists()).toBeTruthy();
    });
  });

  describe('IPNS Access tests', () => {
    let ipnsRecordToDelete: Ipns;
    beforeAll(async () => {
      ipnsRecordToDelete = await new Ipns({}, stage.storageContext)
        .fake()
        .populate({
          project_uuid: testProject.project_uuid,
          bucket_id: testBucket.id,
        })
        .insert();
    });
    test('User should NOT be able to delete ANOTHER project IPNS record', async () => {
      const response = await request(stage.http)
        .delete(`/buckets/${testBucket.id}/ipns/${ipnsRecordToDelete.id}`)
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
      expect(response.body.message).toBe(
        'Insufficient permissions to modify this record',
      );

      const tmpIpns: Ipns = await new Ipns(
        {},
        stage.storageContext,
      ).populateById(ipnsRecordToDelete.id);
      expect(tmpIpns.exists()).toBeTruthy();
    });

    test('User should NOT be able to list ipns records inside ANOTHER bucket', async () => {
      const response = await request(stage.http)
        .get(`/buckets/${testBucket.id}/ipns`)
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
      expect(response.body.message).toBe(
        'Insufficient permissions to access this record',
      );
    });

    test('User should NOT be able to create IPNS record for ANOTHER bucket', async () => {
      const response = await request(stage.http)
        .post(`/buckets/${testBucket.id}/ipns`)
        .send({ name: 'My new IPNS' })
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
      expect(response.body.message).toBe(
        'Insufficient permissions to modify this record',
      );
    });

    test('Admin User should be able to list ipns records inside bucket', async () => {
      const response = await request(stage.http)
        .get(`/buckets/${testBucket.id}/ipns`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBeGreaterThan(0);
    });

    test('Admin User should NOT be able to create IPNS record', async () => {
      const response = await request(stage.http)
        .post(`/buckets/${testBucket.id}/ipns`)
        .send({ name: 'My new IPNS' })
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Insufficient permissions');
    });
  });

  describe('Publish IPNS tests', () => {
    let file: File;
    let publishedIpnsName: string;
    beforeAll(async () => {
      //Create new file & CID
      file = await createTestBucketFile(
        stage.storageContext,
        testBucket,
        'Test file on IPFS.txt',
        'text/plain',
        true,
      );
    });

    test('User should recieve 422 unprocessable entity status, if passing invalid body', async () => {
      const response = await request(stage.http)
        .post(`/buckets/${testBucket.id}/ipns/${ipnsRecord.id}/publish`)
        .send()
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(422);
      expect(response.body.errors).toBeTruthy();
    });
    test('User should be able to publish CID to IPNS', async () => {
      const response = await request(stage.http)
        .post(`/buckets/${testBucket.id}/ipns/${ipnsRecord.id}/publish`)
        .send({ cid: file.CID })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.id).toBeTruthy();

      const publishedIpns: Ipns = await new Ipns(
        {},
        stage.storageContext,
      ).populateById(response.body.data.id);
      expect(publishedIpns.exists()).toBeTruthy();
      expect(publishedIpns.ipnsName).toBeTruthy();
      expect(publishedIpns.ipnsValue).toBeTruthy();
      expect(publishedIpns.status).toBe(SqlModelStatus.ACTIVE);

      publishedIpnsName = publishedIpns.ipnsName;
    });

    test('User should be able to download file from apillon ipns gateway', async () => {
      expect(publishedIpnsName).toBeTruthy();
      const response = await request(
        env.STORAGE_IPFS_GATEWAY.replace('/ipfs/', '/ipns/') +
          publishedIpnsName,
      ).get('');
      expect(response.status).toBe(200);
    });
  });

  describe('IPNS delete tests', () => {
    let ipnsRecordToDelete: Ipns;
    beforeAll(async () => {
      ipnsRecordToDelete = await new Ipns({}, stage.storageContext)
        .fake()
        .populate({
          project_uuid: testProject.project_uuid,
          bucket_id: testBucket.id,
        })
        .insert();
    });

    test('User should be able to delete IPNS record', async () => {
      const response = await request(stage.http)
        .delete(`/buckets/${testBucket.id}/ipns/${ipnsRecordToDelete.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(ipnsRecordToDelete.id);

      const tmpIpns: Ipns = await new Ipns(
        {},
        stage.storageContext,
      ).populateById(ipnsRecordToDelete.id);
      expect(tmpIpns.exists()).toBeFalsy();
    });
  });
});
