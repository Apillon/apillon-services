import { DefaultUserRole, SqlModelStatus } from '@apillon/lib';
import { BucketType } from '@apillon/storage/src/config/types';
import { addJwtToIPFSUrl } from '@apillon/storage/src/lib/ipfs-utils';
import { Bucket } from '@apillon/storage/src/modules/bucket/models/bucket.model';
import { ProjectConfig } from '@apillon/storage/src/modules/config/models/project-config.model';
import { Ipns } from '@apillon/storage/src/modules/ipns/models/ipns.model';
import { File } from '@apillon/storage/src/modules/storage/models/file.model';
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
    testUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    adminTestUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
      DefaultUserRole.ADMIN,
    );
    testProject = await createTestProject(testUser, stage);
    testBucket = await createTestBucket(
      testUser,
      stage.context.storage,
      testProject,
      BucketType.STORAGE,
    );

    ipnsRecord = await new Ipns({}, stage.context.storage)
      .fake()
      .populate({
        project_uuid: testProject.project_uuid,
        bucket_id: testBucket.id,
      })
      .insert();

    testUser2 = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    testProject2 = await createTestProject(testUser2, stage);

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
        .get(`/buckets/${testBucket.bucket_uuid}/ipns`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0].name).toBeTruthy();
    });

    test('User should recieve 422 if invalid body', async () => {
      const response = await request(stage.http)
        .post(`/buckets/${testBucket.bucket_uuid}/ipns`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(422);
      expect(response.body.errors.length).toBe(1);
      expect(response.body.errors.find((x) => x.code == 42200026)).toBeTruthy();
    });

    test('User should be able to create IPNS record', async () => {
      const response = await request(stage.http)
        .post(`/buckets/${testBucket.bucket_uuid}/ipns`)
        .send({ name: 'My new IPNS' })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      expect(response.body.data.ipns_uuid).toBeTruthy();
      expect(response.body.data.name).toBeTruthy();

      const newIpns: Ipns = await new Ipns(
        {},
        stage.context.storage,
      ).populateByUUID(response.body.data.ipns_uuid);
      expect(newIpns.exists()).toBeTruthy();
    });

    test('User should be able to update IPNS record', async () => {
      const response = await request(stage.http)
        .patch(
          `/buckets/${testBucket.bucket_uuid}/ipns/${ipnsRecord.ipns_uuid}`,
        )
        .send({
          name: 'My updated IPNS record',
          description: 'This is new description',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.ipns_uuid).toBeTruthy();
      expect(response.body.data.name).toBe('My updated IPNS record');
      const updatedIpns: Ipns = await new Ipns(
        {},
        stage.context.storage,
      ).populateByUUID(ipnsRecord.ipns_uuid);
      expect(updatedIpns.exists()).toBeTruthy();
    });
  });

  describe('IPNS Access tests', () => {
    let ipnsRecordToDelete: Ipns;
    beforeAll(async () => {
      ipnsRecordToDelete = await new Ipns({}, stage.context.storage)
        .fake()
        .populate({
          project_uuid: testProject.project_uuid,
          bucket_id: testBucket.id,
        })
        .insert();
    });
    test('User should NOT be able to delete ANOTHER project IPNS record', async () => {
      const response = await request(stage.http)
        .delete(
          `/buckets/${testBucket.bucket_uuid}/ipns/${ipnsRecordToDelete.ipns_uuid}`,
        )
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
      expect(response.body.message).toBe(
        'Insufficient permissions to modify this record',
      );

      const tmpIpns: Ipns = await new Ipns(
        {},
        stage.context.storage,
      ).populateByUUID(ipnsRecordToDelete.ipns_uuid);
      expect(tmpIpns.exists()).toBeTruthy();
    });

    test('User should NOT be able to list ipns records inside ANOTHER bucket', async () => {
      const response = await request(stage.http)
        .get(`/buckets/${testBucket.bucket_uuid}/ipns`)
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
      expect(response.body.message).toBe(
        'Insufficient permissions to access this record',
      );
    });

    test('User should NOT be able to create IPNS record for ANOTHER bucket', async () => {
      const response = await request(stage.http)
        .post(`/buckets/${testBucket.bucket_uuid}/ipns`)
        .send({ name: 'My new IPNS' })
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
      expect(response.body.message).toBe(
        'Insufficient permissions to modify this record',
      );
    });

    test('Admin User should be able to list ipns records inside bucket', async () => {
      const response = await request(stage.http)
        .get(`/buckets/${testBucket.bucket_uuid}/ipns`)
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBeGreaterThan(0);
    });

    test('Admin User should NOT be able to create IPNS record', async () => {
      const response = await request(stage.http)
        .post(`/buckets/${testBucket.bucket_uuid}/ipns`)
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
        stage.context.storage,
        testBucket,
        'Test file on IPFS.txt',
        'text/plain',
        true,
      );
    });

    test('User should recieve 422 unprocessable entity status, if passing invalid body', async () => {
      const response = await request(stage.http)
        .post(
          `/buckets/${testBucket.bucket_uuid}/ipns/${ipnsRecord.ipns_uuid}/publish`,
        )
        .send()
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(422);
      expect(response.body.errors).toBeTruthy();
    });
    test('User should be able to publish CID to IPNS', async () => {
      const response = await request(stage.http)
        .post(
          `/buckets/${testBucket.bucket_uuid}/ipns/${ipnsRecord.ipns_uuid}/publish`,
        )
        .send({ cid: file.CID })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.ipns_uuid).toBeTruthy();

      const publishedIpns: Ipns = await new Ipns(
        {},
        stage.context.storage,
      ).populateByUUID(response.body.data.ipns_uuid);
      expect(publishedIpns.exists()).toBeTruthy();
      expect(publishedIpns.ipnsName).toBeTruthy();
      expect(publishedIpns.ipnsValue).toBeTruthy();
      expect(publishedIpns.status).toBe(SqlModelStatus.ACTIVE);

      publishedIpnsName = publishedIpns.ipnsName;
    });

    test('User should be able to download file from apillon ipns gateway', async () => {
      const ipfsCluster = await new ProjectConfig(
        { project_uuid: ipnsRecord.project_uuid },
        stage.context.storage,
      ).getIpfsCluster();

      expect(publishedIpnsName).toBeTruthy();
      const response = await request(
        addJwtToIPFSUrl(
          ipfsCluster.ipnsGateway + publishedIpnsName,
          testProject.project_uuid,
          publishedIpnsName,
          ipfsCluster,
        ),
      ).get('');
      expect(response.status).toBe(200);
    });
  });

  describe('IPNS delete tests', () => {
    let ipnsRecordToDelete: Ipns;
    beforeAll(async () => {
      ipnsRecordToDelete = await new Ipns({}, stage.context.storage)
        .fake()
        .populate({
          name: 'ipns to delete',
          project_uuid: testProject.project_uuid,
          bucket_id: testBucket.id,
        })
        .insert();
    });

    test('User should be able to delete IPNS record', async () => {
      const response = await request(stage.http)
        .delete(
          `/buckets/${testBucket.bucket_uuid}/ipns/${ipnsRecordToDelete.ipns_uuid}`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      const tmpIpns: Ipns = await new Ipns(
        {},
        stage.context.storage,
      ).populateByUUID(ipnsRecordToDelete.ipns_uuid);
      expect(tmpIpns.exists()).toBeFalsy();
    });
  });
});
