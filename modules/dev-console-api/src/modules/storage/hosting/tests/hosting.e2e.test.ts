import {
  BucketType,
  StorageErrorCode,
} from '@apillon/storage/src/config/types';
import { Bucket } from '@apillon/storage/src/modules/bucket/models/bucket.model';
import { WebPage } from '@apillon/storage/src/modules/hosting/models/web-page.model';
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

describe('Hosting tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testUser2: TestUser;

  let testProject: Project;
  let testProject2: Project;

  let testWebPage: WebPage;
  let testSession_uuid: string;

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testUser2 = await createTestUser(stage.devConsoleContext, stage.amsContext);

    testProject = await createTestProject(testUser, stage.devConsoleContext);
    testProject2 = await createTestProject(testUser2, stage.devConsoleContext);

    //Create test web page record
    const webPageBucket = await createTestBucket(
      testUser,
      stage.storageContext,
      testProject,
      BucketType.HOSTING,
    );
    const webPageStagingBucket = await createTestBucket(
      testUser,
      stage.storageContext,
      testProject,
      BucketType.HOSTING,
    );
    const webPageProductionBucket = await createTestBucket(
      testUser,
      stage.storageContext,
      testProject,
      BucketType.HOSTING,
    );

    testWebPage = await new WebPage({}, stage.storageContext)
      .populate({
        project_uuid: testProject.project_uuid,
        bucket_id: webPageBucket.id,
        stagingBucket_id: webPageStagingBucket.id,
        productionBucket_id: webPageProductionBucket.id,
        name: 'Test web page',
        domain: 'https://hosting-e2e-tests.si',
        bucket: webPageBucket,
        stagingBucket: webPageStagingBucket,
        productionBucket: webPageProductionBucket,
      })
      .insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Web page CRUD tests', () => {
    test('User should be able to get web page list', async () => {
      const response = await request(stage.http)
        .get(
          `/storage/hosting/web-pages?project_uuid=${testProject.project_uuid}`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0]?.id).toBeTruthy();
      expect(response.body.data.items[0]?.bucket_id).toBeTruthy();
      expect(response.body.data.items[0]?.stagingBucket_id).toBeTruthy();
      expect(response.body.data.items[0]?.productionBucket_id).toBeTruthy();
      expect(response.body.data.items[0]?.name).toBeTruthy();
      expect(response.body.data.items[0]?.domain).toBeTruthy();
    });

    test('User should NOT be able to get ANOTHER USER web pages', async () => {
      const response = await request(stage.http)
        .get(
          `/storage/hosting/web-pages?project_uuid=${testProject.project_uuid}`,
        )
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });

    test('User should be able to get web page by id', async () => {
      const response = await request(stage.http)
        .get(`/storage/hosting/web-pages/${testWebPage.id}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.bucket_id).toBeTruthy();
      expect(response.body.data.stagingBucket_id).toBeTruthy();
      expect(response.body.data.productionBucket_id).toBeTruthy();
      expect(response.body.data.name).toBeTruthy();
      expect(response.body.data.domain).toBeTruthy();

      expect(response.body.data.bucket).toBeTruthy();
      expect(response.body.data.stagingBucket).toBeTruthy();
      expect(response.body.data.productionBucket).toBeTruthy();
    });

    test('User should NOT be able to create web page in ANOTHER user project', async () => {
      const response = await request(stage.http)
        .post(`/storage/hosting/web-page`)
        .send({
          project_uuid: testProject2.project_uuid,
          name: 'My test web page',
          domain: 'https://www.my-test-page.si',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(403);
      expect(response.body.message).toBe(
        'Insufficient permissions to modify this record',
      );
    });

    test('User should recieve 422 if invalid body in POST method', async () => {
      const response = await request(stage.http)
        .post(`/storage/hosting/web-page`)
        .send({})
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(422);
    });

    test('User should be able to create new web page', async () => {
      const response = await request(stage.http)
        .post(`/storage/hosting/web-page`)
        .send({
          project_uuid: testProject.project_uuid,
          name: 'My test web page',
          domain: 'https://www.my-test-page.si',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      expect(response.body.data.id).toBeTruthy();
      expect(response.body.data.bucket_id).toBeTruthy();
      expect(response.body.data.stagingBucket_id).toBeTruthy();
      expect(response.body.data.productionBucket_id).toBeTruthy();
      expect(response.body.data.name).toBe('My test web page');
      expect(response.body.data.domain).toBe('https://www.my-test-page.si');

      const wp: WebPage = await new WebPage(
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

    test('User should recieve 404 if web page does not exists', async () => {
      const response = await request(stage.http)
        .patch(`/storage/hosting/web-pages/44444`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(404);
      expect(response.body.code).toBe(StorageErrorCode.WEB_PAGE_NOT_FOUND);
      expect(response.body.message).toBe(
        StorageErrorCode[StorageErrorCode.WEB_PAGE_NOT_FOUND],
      );
    });

    test('User should be able to update bucket', async () => {
      const response = await request(stage.http)
        .patch(`/storage/hosting/web-pages/${testWebPage.id}`)
        .send({
          name: 'Updated web page name',
          description: 'Some awesome descirption',
          domain: 'https://banane.si',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.id).toBeTruthy();
      expect(response.body.data.name).toBe('Updated web page name');
      expect(response.body.data.description).toBe('Some awesome descirption');

      const wp: WebPage = await new WebPage(
        {},
        stage.storageContext,
      ).populateById(response.body.data.id);
      expect(wp.exists()).toBeTruthy();
      expect(wp.name).toBe('Updated web page name');
      expect(wp.description).toBe('Some awesome descirption');
      expect(wp.domain).toBe('https://banane.si');
    });
  });

  describe('Upload files and deploy page tests', () => {
    let file1_uuid: string;
    let file2_uuid: string;

    test('User should be able to upload files to bucket for web page preview', async () => {
      testSession_uuid = uuidV4();

      //Upload 2 files, each into its own directory
      let response = await request(stage.http)
        .post(`/storage/${testWebPage.bucket.bucket_uuid}/file-upload`)
        .send({
          session_uuid: testSession_uuid,
          fileName: 'index.html',
          contentType: 'text/plain',
          path: '',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      file1_uuid = response.body.data.file_uuid;
      const file1_signedUrlForUpload = response.body.data.url;

      response = await request(file1_signedUrlForUpload)
        .put(``)
        .send(
          `<h1>This is test page. Curr date: ${new Date().toString()}</h1>`,
        );
      expect(response.status).toBe(200);

      response = await request(stage.http)
        .post(`/storage/${testWebPage.bucket.bucket_uuid}/file-upload`)
        .send({
          session_uuid: testSession_uuid,
          fileName: 'styles.css',
          contentType: 'text/plain',
          path: 'assets/',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      file2_uuid = response.body.data.file_uuid;
      const file2_signedUrlForUpload = response.body.data.url;

      response = await request(file2_signedUrlForUpload)
        .put(``)
        .send(`h1{font:weight: bolder;}`);
      expect(response.status).toBe(200);
    });

    test('User should be able to end session and create files in preview bucket', async () => {
      const response = await request(stage.http)
        .post(
          `/storage/${testWebPage.bucket.bucket_uuid}/file-upload/${testSession_uuid}/end`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      //check if files were created in bucket
      const file: File = await new File(
        {},
        stage.storageContext,
      ).populateByUUID(file1_uuid);

      expect(file.exists()).toBeTruthy();
      expect(file.bucket_id).toBe(testWebPage.bucket_id);
    });

    test('User should be able to deploy web page to staging', async () => {
      const response = await request(stage.http)
        .post(`/storage/hosting/web-pages/${testWebPage.id}/deploy`)
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
        testWebPage.stagingBucket_id,
        stage.storageContext,
      );
      expect(filesInBucket.length).toBe(2);
      expect(filesInBucket[0].CID).toBeTruthy();

      //check if directory was created
      const dirsInBucket = await new Directory(
        {},
        stage.storageContext,
      ).populateDirectoriesInBucket(
        testWebPage.stagingBucket_id,
        stage.storageContext,
      );
      expect(dirsInBucket.length).toBe(1);
    });

    test('User should be able to deploy web page to production', async () => {
      const response = await request(stage.http)
        .post(`/storage/hosting/web-pages/${testWebPage.id}/deploy`)
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
        testWebPage.productionBucket_id,
        stage.storageContext,
      );
      expect(filesInBucket.length).toBe(2);
      expect(filesInBucket[0].CID).toBeTruthy();

      //check if directory was created
      const dirsInBucket = await new Directory(
        {},
        stage.storageContext,
      ).populateDirectoriesInBucket(
        testWebPage.productionBucket_id,
        stage.storageContext,
      );
      expect(dirsInBucket.length).toBe(1);
    });

    test('User should NOT be able to deploy web page to production if no changes were made', async () => {
      const response = await request(stage.http)
        .post(`/storage/hosting/web-pages/${testWebPage.id}/deploy`)
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
        .get(`/storage/hosting/web-pages/${testWebPage.id}/deployments`)
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
          `/storage/hosting/web-pages/${testWebPage.id}/deployments?environment=1`,
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
        testWebPage.bucket,
        'delete file test.txt',
        'text/plain',
        false,
      );
      dirToDelete = await createTestBucketDirectory(
        stage.storageContext,
        testProject,
        testWebPage.bucket,
        true,
      );
    });
    test('User should NOT be able to delete file from ANOTHER USER web page preview bucket', async () => {
      const response = await request(stage.http)
        .delete(
          `/storage/${testWebPage.bucket.bucket_uuid}/file/${fileToDelete.id}`,
        )
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });
    test('User should be able to delete file from web page preview bucket', async () => {
      const response = await request(stage.http)
        .delete(
          `/storage/${testWebPage.bucket.bucket_uuid}/file/${fileToDelete.id}`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      const f: File = await new File({}, stage.storageContext).populateById(
        fileToDelete.id,
      );
      expect(f.exists()).toBeFalsy();
    });

    test('User should NOT be able to delete ANOTHER USER directory from web page preview bucket', async () => {
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

    test('User should be able to delete directory from web page preview bucket', async () => {
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
        .delete(`/buckets/${testWebPage.bucket.id}/content`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      const filesInBucket: File[] = await new File(
        {},
        stage.storageContext,
      ).populateFilesInBucket(testWebPage.bucket.id, stage.storageContext);
      expect(filesInBucket.length).toBe(0);
    });

    test('User should NOT be able to clear ANOTHER USER bucket content', async () => {
      const response = await request(stage.http)
        .delete(`/buckets/${testWebPage.bucket.id}/content`)
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });
  });
  describe('Webpage quota tests', () => {
    beforeAll(async () => {
      //Insert dummy web pages
      for (let i = 0; i < 10; i++) {
        const webPageBucket = await createTestBucket(
          testUser,
          stage.storageContext,
          testProject2,
          BucketType.HOSTING,
        );
        const webPageStagingBucket = await createTestBucket(
          testUser,
          stage.storageContext,
          testProject2,
          BucketType.HOSTING,
        );
        const webPageProductionBucket = await createTestBucket(
          testUser,
          stage.storageContext,
          testProject2,
          BucketType.HOSTING,
        );
        await new WebPage({}, stage.storageContext)
          .populate({
            project_uuid: testProject2.project_uuid,
            bucket_id: webPageBucket.id,
            stagingBucket_id: webPageStagingBucket.id,
            productionBucket_id: webPageProductionBucket.id,
            name: 'Test web page' + i.toString(),
            domain: 'https://hosting-e2e-tests.si',
            bucket: webPageBucket,
            stagingBucket: webPageStagingBucket,
            productionBucket: webPageProductionBucket,
          })
          .insert();
      }
    });
    test('User should recieve status 400 when max webpages quota is reached', async () => {
      const response = await request(stage.http)
        .post(`/storage/hosting/web-page`)
        .send({
          project_uuid: testProject2.project_uuid,
          name: 'My test web page',
          domain: 'https://www.my-test-page.si',
        })
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        StorageErrorCode[StorageErrorCode.MAX_WEB_PAGES_REACHED],
      );
    });
  });
});
