import {
  BucketType,
  StorageErrorCode,
} from '@apillon/storage/src/config/types';
import { Bucket } from '@apillon/storage/src/modules/bucket/models/bucket.model';
import { Website } from '@apillon/storage/src/modules/hosting/models/website.model';
import {
  createTestBucket,
  createTestBucketDirectory,
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
import { v4 as uuidV4 } from 'uuid';
import { File } from '@apillon/storage/src/modules/storage/models/file.model';
import { Directory } from '@apillon/storage/src/modules/directory/models/directory.model';
import { DefaultUserRole } from '@apillon/lib';
import { Credit } from '@apillon/config/src/modules/credit/models/credit.model';

describe('Hosting tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testUser2: TestUser;
  let adminTestUser: TestUser;

  let testProject: Project;
  let testProject2: Project;

  let testWebsite: Website;
  let testSession_uuid: string;

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testUser2 = await createTestUser(stage.devConsoleContext, stage.amsContext);
    adminTestUser = await createTestUser(
      stage.devConsoleContext,
      stage.amsContext,
      DefaultUserRole.ADMIN,
    );

    testProject = await createTestProject(testUser, stage);
    testProject2 = await createTestProject(testUser2, stage);

    //Create test Website record
    testWebsite = await new Website({}, stage.storageContext)
      .populate({
        project_uuid: testProject.project_uuid,
        name: 'Test Website',
        domain: 'https://hosting-e2e-tests.si',
      })
      .createNewWebsite(stage.storageContext, uuidV4());
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Website CRUD tests', () => {
    test('User should be able to get Website list', async () => {
      const response = await request(stage.http)
        .get(
          `/storage/hosting/websites?project_uuid=${testProject.project_uuid}`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0]?.id).toBeTruthy();
      expect(response.body.data.items[0]?.name).toBeTruthy();
      expect(response.body.data.items[0]?.domain).toBeTruthy();
    });

    test('User should be able to get Website by id', async () => {
      const response = await request(stage.http)
        .get(`/storage/hosting/websites/${testWebsite.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.name).toBeTruthy();
      expect(response.body.data.domain).toBeTruthy();

      expect(response.body.data.bucket).toBeTruthy();
      expect(response.body.data.stagingBucket).toBeTruthy();
      expect(response.body.data.productionBucket).toBeTruthy();
    });

    test('User should recieve 422 if invalid body in POST method', async () => {
      const response = await request(stage.http)
        .post(`/storage/hosting/website`)
        .send({})
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(422);
    });

    test('User should be able to create new Website', async () => {
      const response = await request(stage.http)
        .post(`/storage/hosting/website`)
        .send({
          project_uuid: testProject.project_uuid,
          name: 'My test Website',
          domain: 'https://www.my-test-page.si',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      expect(response.body.data.id).toBeTruthy();
      expect(response.body.data.name).toBe('My test Website');
      expect(response.body.data.domain).toBe('https://www.my-test-page.si');

      const wp: Website = await new Website(
        {},
        stage.storageContext,
      ).populateById(response.body.data.id);
      expect(wp.exists()).toBeTruthy();
      try {
        await wp.validate();
      } catch (err) {
        await wp.handle(err);
        expect(wp.isValid()).toBeTruthy();
      }

      //Also check that bucket exists
      const b: Bucket = await new Bucket({}, stage.storageContext).populateById(
        wp.bucket_id,
      );
      expect(b.exists()).toBeTruthy();
    });

    test('User should recieve 404 if Website does not exists', async () => {
      const response = await request(stage.http)
        .patch(`/storage/hosting/websites/44444`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(404);
      expect(response.body.code).toBe(StorageErrorCode.WEBSITE_NOT_FOUND);
      expect(response.body.message).toBe(
        StorageErrorCode[StorageErrorCode.WEBSITE_NOT_FOUND],
      );
    });

    test('User should be able to update website', async () => {
      const response = await request(stage.http)
        .patch(`/storage/hosting/websites/${testWebsite.id}`)
        .send({
          name: 'Updated Website name',
          description: 'Some awesome descirption',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.id).toBeTruthy();
      expect(response.body.data.name).toBe('Updated Website name');
      expect(response.body.data.description).toBe('Some awesome descirption');

      const wp: Website = await new Website(
        {},
        stage.storageContext,
      ).populateById(response.body.data.id);
      expect(wp.exists()).toBeTruthy();
      expect(wp.name).toBe('Updated Website name');
      expect(wp.description).toBe('Some awesome descirption');
    });

    test('User should NOT be able to update website domain in less than 15 minutes', async () => {
      const response = await request(stage.http)
        .patch(`/storage/hosting/websites/${testWebsite.id}`)
        .send({
          domain: 'https://www.my-test-page-2.si',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(400);
      expect(response.body.code).toBe(40006019);
    });

    test('User should be able to update website domain after 15 minutes', async () => {
      let wp: Website = await new Website(
        {},
        stage.storageContext,
      ).populateById(testWebsite.id);
      wp.domainChangeDate = new Date(Date.now() - 16000 * 60); //Minus 16 minutes
      await wp.update();

      const response = await request(stage.http)
        .patch(`/storage/hosting/websites/${testWebsite.id}`)
        .send({
          domain: 'https://www.my-test-page-2.si',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      wp = await new Website({}, stage.storageContext).populateById(
        response.body.data.id,
      );
      expect(wp.domain).toBe('https://www.my-test-page-2.si');
    });
  });

  describe('Website Acess tests', () => {
    test('User should NOT be able to get ANOTHER USER web pages', async () => {
      const response = await request(stage.http)
        .get(
          `/storage/hosting/websites?project_uuid=${testProject.project_uuid}`,
        )
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });

    test('User should NOT be able to create Website in ANOTHER user project', async () => {
      const response = await request(stage.http)
        .post(`/storage/hosting/website`)
        .send({
          project_uuid: testProject2.project_uuid,
          name: 'My test Website',
          domain: 'https://www.my-test-page.si',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(403);
      expect(response.body.message).toBe(
        'Insufficient permissions to modify this record',
      );
    });

    test('Admin user should be able to get Website list', async () => {
      const response = await request(stage.http)
        .get(
          `/storage/hosting/websites?project_uuid=${testProject.project_uuid}`,
        )
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBeGreaterThan(0);
    });

    test('Admin User should NOT be able to create Website', async () => {
      const response = await request(stage.http)
        .post(`/storage/hosting/website`)
        .send({
          project_uuid: testProject2.project_uuid,
          name: 'My test Website',
          domain: 'https://www.my-test-page.si',
        })
        .set('Authorization', `Bearer ${adminTestUser.token}`);
      expect(response.status).toBe(403);
    });
  });

  describe('Upload files and deploy page tests', () => {
    let file1Fur: any;
    let file2Fur: any;

    test('User should be able to upload files to bucket for Website preview', async () => {
      testSession_uuid = uuidV4();

      //Upload 2 files, each into its own directory
      let response = await request(stage.http)
        .post(`/storage/${testWebsite.bucket.bucket_uuid}/files-upload`)
        .send({
          session_uuid: testSession_uuid,
          files: [
            {
              fileName: 'index.html',
              contentType: 'text/html',
              path: '',
            },
            {
              fileName: 'styles.css',
              contentType: 'text/css',
              path: 'styles',
            },
          ],
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);

      expect(response.status).toBe(201);
      file1Fur = response.body.data.files.find(
        (x) => x.fileName == 'index.html',
      );
      file2Fur = response.body.data.files.find(
        (x) => x.fileName == 'styles.css',
      );

      response = await request(file1Fur.url)
        .put(``)
        .send(
          `<h1>This is test page. Curr date: ${new Date().toString()}</h1>`,
        );
      expect(response.status).toBe(200);

      response = await request(file2Fur.url)
        .put(``)
        .send(`h1{font:weight: bolder;}`);
      expect(response.status).toBe(200);
    });

    test('User should be able to end session and create files in preview bucket', async () => {
      const response = await request(stage.http)
        .post(
          `/storage/${testWebsite.bucket.bucket_uuid}/file-upload/${testSession_uuid}/end`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      //check if files were created in bucket
      const file: File = await new File(
        {},
        stage.storageContext,
      ).populateByUUID(file1Fur.file_uuid);

      expect(file.exists()).toBeTruthy();
      expect(file.bucket_id).toBe(testWebsite.bucket_id);
    });

    test('User should be able to deploy Website to staging', async () => {
      const response = await request(stage.http)
        .post(`/storage/hosting/websites/${testWebsite.id}/deploy`)
        .send({
          environment: 1,
          directDeploy: true,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      //check if files were created in staging bucket and have CID
      const filesInBucket = await new File(
        {},
        stage.storageContext,
      ).populateFilesInBucket(
        testWebsite.stagingBucket_id,
        stage.storageContext,
      );
      expect(filesInBucket.length).toBe(2);
      expect(filesInBucket[0].CID).toBeTruthy();

      //check if directory was created
      const dirsInBucket = await new Directory(
        {},
        stage.storageContext,
      ).populateDirectoriesInBucket(
        testWebsite.stagingBucket_id,
        stage.storageContext,
      );
      expect(dirsInBucket.length).toBe(1);
    });

    test('User should be able to deploy Website to production', async () => {
      const response = await request(stage.http)
        .post(`/storage/hosting/websites/${testWebsite.id}/deploy`)
        .send({
          environment: 2,
          directDeploy: true,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      //check if files were created in production bucket and have CID
      const filesInBucket = await new File(
        {},
        stage.storageContext,
      ).populateFilesInBucket(
        testWebsite.productionBucket_id,
        stage.storageContext,
      );
      expect(filesInBucket.length).toBe(2);
      expect(filesInBucket[0].CID).toBeTruthy();

      //check if directory was created
      const dirsInBucket = await new Directory(
        {},
        stage.storageContext,
      ).populateDirectoriesInBucket(
        testWebsite.productionBucket_id,
        stage.storageContext,
      );
      expect(dirsInBucket.length).toBe(1);
    });

    test('User should NOT be able to deploy Website to production if no changes were made', async () => {
      const response = await request(stage.http)
        .post(`/storage/hosting/websites/${testWebsite.id}/deploy`)
        .send({
          environment: 2,
          directDeploy: true,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        StorageErrorCode[StorageErrorCode.NO_CHANGES_TO_DEPLOY],
      );
    });

    test('User should be able to list deployments', async () => {
      const response = await request(stage.http)
        .get(`/storage/hosting/websites/${testWebsite.id}/deployments`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBeGreaterThan(0);
      expect(response.body.data.items[0].deploymentStatus).toBe(10);
      expect(response.body.data.items[0].cid).toBeTruthy();
      expect(response.body.data.items[0].number).toBeTruthy();
      expect(response.body.data.items[0].size).toBeTruthy();
    });

    test('User should be able to list deployments with filter', async () => {
      const response = await request(stage.http)
        .get(
          `/storage/hosting/websites/${testWebsite.id}/deployments?environment=1`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
    });
  });

  describe('Delete files, directories from preview bucket, or clear whole bucket content', () => {
    let fileToDelete: File;
    let dirToDelete: Directory;
    beforeAll(async () => {
      fileToDelete = await createTestBucketFile(
        stage.storageContext,
        testWebsite.bucket,
        'delete file test.txt',
        'text/plain',
        false,
      );
      dirToDelete = await createTestBucketDirectory(
        stage.storageContext,
        testProject,
        testWebsite.bucket,
        true,
      );
    });
    test('User should NOT be able to delete file from ANOTHER USER Website preview bucket', async () => {
      const response = await request(stage.http)
        .delete(
          `/storage/${testWebsite.bucket.bucket_uuid}/file/${fileToDelete.id}`,
        )
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });
    test('User should be able to delete file from Website preview bucket', async () => {
      const response = await request(stage.http)
        .delete(
          `/storage/${testWebsite.bucket.bucket_uuid}/file/${fileToDelete.id}`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      const f: File = await new File({}, stage.storageContext).populateById(
        fileToDelete.id,
      );
      expect(f.exists()).toBeFalsy();
    });

    test('User should NOT be able to delete ANOTHER USER directory from Website preview bucket', async () => {
      const response = await request(stage.http)
        .delete(`/directories/${dirToDelete.id}`)
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);

      const d: Directory = await new Directory(
        {},
        stage.storageContext,
      ).populateById(dirToDelete.id);
      expect(d.exists()).toBeTruthy();
    });

    test('User should be able to delete directory from Website preview bucket', async () => {
      const response = await request(stage.http)
        .delete(`/directories/${dirToDelete.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      const d: Directory = await new Directory(
        {},
        stage.storageContext,
      ).populateById(dirToDelete.id);
      expect(d.exists()).toBeFalsy();
    });

    test('User should be able to clear bucket content', async () => {
      const response = await request(stage.http)
        .delete(`/buckets/${testWebsite.bucket.id}/content`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      const filesInBucket: File[] = await new File(
        {},
        stage.storageContext,
      ).populateFilesInBucket(testWebsite.bucket.id, stage.storageContext);
      expect(filesInBucket.length).toBe(0);
    });

    test('User should NOT be able to clear ANOTHER USER bucket content', async () => {
      const response = await request(stage.http)
        .delete(`/buckets/${testWebsite.bucket.id}/content`)
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });
  });
  describe('Website quota tests', () => {
    beforeAll(async () => {
      //Insert dummy web pages
      for (let i = 0; i < 10; i++) {
        const websiteBucket = await createTestBucket(
          testUser,
          stage.storageContext,
          testProject2,
          BucketType.HOSTING,
        );
        const websiteStagingBucket = await createTestBucket(
          testUser,
          stage.storageContext,
          testProject2,
          BucketType.HOSTING,
        );
        const websiteProductionBucket = await createTestBucket(
          testUser,
          stage.storageContext,
          testProject2,
          BucketType.HOSTING,
        );
        await new Website({}, stage.storageContext)
          .populate({
            project_uuid: testProject2.project_uuid,
            bucket_id: websiteBucket.id,
            stagingBucket_id: websiteStagingBucket.id,
            productionBucket_id: websiteProductionBucket.id,
            name: 'Test Website' + i.toString(),
            domain: 'https://hosting-e2e-tests.si',
            bucket: websiteBucket,
            stagingBucket: websiteStagingBucket,
            productionBucket: websiteProductionBucket,
          })
          .insert();
      }
    });
    test('User should receive status 402 when not enough credits is available for project', async () => {
      const projectCredit: Credit = await new Credit(
        {},
        stage.configContext,
      ).populateByUUID(testProject2.project_uuid);
      projectCredit.balance = 1;
      await projectCredit.update();

      const response = await request(stage.http)
        .post(`/storage/hosting/website`)
        .send({
          project_uuid: testProject2.project_uuid,
          name: 'My test Website',
          domain: 'https://www.my-test-page.si',
        })
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(402);
    });
  });
});
