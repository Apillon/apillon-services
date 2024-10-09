import { Credit } from '@apillon/config/src/modules/credit/models/credit.model';
import { DefaultUserRole, JwtTokenType, generateJwtToken } from '@apillon/lib';
import {
  DeploymentStatus,
  StorageErrorCode,
  WebsiteDomainStatus,
} from '@apillon/storage/src/config/types';
import { Bucket } from '@apillon/storage/src/modules/bucket/models/bucket.model';
import { Directory } from '@apillon/storage/src/modules/directory/models/directory.model';
import { Website } from '@apillon/storage/src/modules/hosting/models/website.model';
import { File } from '@apillon/storage/src/modules/storage/models/file.model';
import {
  Stage,
  TestUser,
  createTestBucketDirectory,
  createTestBucketFile,
  createTestProject,
  createTestUser,
  releaseStage,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { v4 as uuidV4 } from 'uuid';
import { setupTest } from '../../../../../test/helpers/setup';
import { Project } from '../../../project/models/project.model';
import { Deployment } from '@apillon/storage/src/modules/hosting/models/deployment.model';
import { ProjectConfig } from '@apillon/storage/src/modules/config/models/project-config.model';

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
    testUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    testUser2 = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    adminTestUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
      DefaultUserRole.ADMIN,
    );

    testProject = await createTestProject(testUser, stage, 1200, 2);
    testProject2 = await createTestProject(testUser2, stage, 1200, 2);

    //Create test Website record
    testWebsite = await new Website({}, stage.context.storage)
      .populate({
        project_uuid: testProject.project_uuid,
        name: 'Test Website',
        domain: 'https://tests.si',
      })
      .createNewWebsite(stage.context.storage, uuidV4());
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
      expect(response.body.data.items[0]?.website_uuid).toBeTruthy();
      expect(response.body.data.items[0]?.name).toBeTruthy();
      expect(response.body.data.items[0]?.domain).toBeTruthy();
    });

    test('User should be able to get Website by uuid', async () => {
      const response = await request(stage.http)
        .get(`/storage/hosting/websites/${testWebsite.website_uuid}`)
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
      expect(response.body.data.website_uuid).toBeTruthy();
      expect(response.body.data.name).toBe('My test Website');
      expect(response.body.data.domain).toBe('https://www.my-test-page.si');

      const wp: Website = await new Website(
        {},
        stage.context.storage,
      ).populateByUUID(response.body.data.website_uuid);
      expect(wp.exists()).toBeTruthy();
      try {
        await wp.validate();
      } catch (err) {
        await wp.handle(err);
        expect(wp.isValid()).toBeTruthy();
      }

      //Also check that bucket exists
      const b: Bucket = await new Bucket(
        {},
        stage.context.storage,
      ).populateById(wp.bucket_id);
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
        .patch(`/storage/hosting/websites/${testWebsite.website_uuid}`)
        .send({
          name: 'Updated Website name',
          description: 'Some awesome descirption',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.website_uuid).toBeTruthy();
      expect(response.body.data.name).toBe('Updated Website name');
      expect(response.body.data.description).toBe('Some awesome descirption');

      const wp: Website = await new Website(
        {},
        stage.context.storage,
      ).populateByUUID(response.body.data.website_uuid);
      expect(wp.exists()).toBeTruthy();
      expect(wp.name).toBe('Updated Website name');
      expect(wp.description).toBe('Some awesome descirption');
    });

    test('User should NOT be able to update website domain in less than 15 minutes', async () => {
      const response = await request(stage.http)
        .patch(`/storage/hosting/websites/${testWebsite.website_uuid}`)
        .send({
          domain: 'https://tests-2.si',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(400);
      expect(response.body.code).toBe(40006019);
    });

    test('User should be able to update website domain after 15 minutes', async () => {
      let wp: Website = await new Website(
        {},
        stage.context.storage,
      ).populateById(testWebsite.id);
      wp.domainChangeDate = new Date(Date.now() - 16000 * 60); //Minus 16 minutes
      await wp.update();

      const response = await request(stage.http)
        .patch(`/storage/hosting/websites/${testWebsite.website_uuid}`)
        .send({
          domain: 'https://tests-2.si',
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      wp = await new Website({}, stage.context.storage).populateById(
        response.body.data.website_uuid,
      );
      expect(wp.domain).toBe('https://tests-2.si');
    });

    test('User should be able to check domain dns', async () => {
      const response = await request(stage.http)
        .post(
          `/storage/hosting/websites/${testWebsite.website_uuid}/check-domain`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      let tmpWebsite = await new Website(
        {},
        stage.context.storage,
      ).populateById(response.body.data.website_uuid);
      expect(tmpWebsite.domainLastCheckDate).toBeTruthy();
      expect(tmpWebsite.domainStatus).toBe(WebsiteDomainStatus.INVALID);

      tmpWebsite.domain = 'nino.ninja';
      await tmpWebsite.update();

      const response2 = await request(stage.http)
        .post(
          `/storage/hosting/websites/${testWebsite.website_uuid}/check-domain`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response2.status).toBe(200);

      tmpWebsite = await new Website({}, stage.context.storage).populateById(
        response2.body.data.website_uuid,
      );
      expect(tmpWebsite.domainStatus).toBe(WebsiteDomainStatus.OK);
    });

    test('User should be able to remove website domain', async () => {
      // Remove the domain
      const response = await request(stage.http)
        .delete(`/storage/hosting/websites/${testWebsite.website_uuid}/domain`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      // Verify the domain has been removed
      const tmpWebsite = await new Website(
        {},
        stage.context.storage,
      ).populateById(testWebsite.website_uuid);
      expect(tmpWebsite.domain).toBeNull();
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
        stage.context.storage,
      ).populateByUUID(file1Fur.file_uuid);

      expect(file.exists()).toBeTruthy();
      expect(file.bucket_id).toBe(testWebsite.bucket_id);
    });

    test('User should be able to deploy Website to staging', async () => {
      const response = await request(stage.http)
        .post(`/storage/hosting/websites/${testWebsite.website_uuid}/deploy`)
        .send({
          environment: 1,
          directDeploy: true,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      //check if files were created in staging bucket and have CID
      const filesInBucket = await new File(
        {},
        stage.context.storage,
      ).populateFilesInBucket(
        testWebsite.stagingBucket_id,
        stage.context.storage,
      );
      expect(filesInBucket.length).toBe(2);
      expect(filesInBucket[0].CID).toBeTruthy();

      //check if directory was created
      const dirsInBucket = await new Directory(
        {},
        stage.context.storage,
      ).populateDirectoriesInBucket(
        testWebsite.stagingBucket_id,
        stage.context.storage,
      );
      expect(dirsInBucket.length).toBe(1);
    });

    test('User should be able to deploy Website to production', async () => {
      const response = await request(stage.http)
        .post(`/storage/hosting/websites/${testWebsite.website_uuid}/deploy`)
        .send({
          environment: 2,
          directDeploy: true,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      //check if files were created in production bucket and have CID
      const filesInBucket = await new File(
        {},
        stage.context.storage,
      ).populateFilesInBucket(
        testWebsite.productionBucket_id,
        stage.context.storage,
      );
      expect(filesInBucket.length).toBe(2);
      expect(filesInBucket[0].CID).toBeTruthy();

      //check if directory was created
      const dirsInBucket = await new Directory(
        {},
        stage.context.storage,
      ).populateDirectoriesInBucket(
        testWebsite.productionBucket_id,
        stage.context.storage,
      );
      expect(dirsInBucket.length).toBe(1);
    });

    test('User should NOT be able to deploy Website to production if no changes were made', async () => {
      const response = await request(stage.http)
        .post(`/storage/hosting/websites/${testWebsite.website_uuid}/deploy`)
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
        .get(
          `/storage/hosting/websites/${testWebsite.website_uuid}/deployments`,
        )
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
          `/storage/hosting/websites/${testWebsite.website_uuid}/deployments?environment=1`,
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
        stage.context.storage,
        testWebsite.bucket,
        'delete file test.txt',
        'text/plain',
        false,
      );
      dirToDelete = await createTestBucketDirectory(
        stage.context.storage,
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

      const f: File = await new File({}, stage.context.storage).populateById(
        fileToDelete.id,
      );
      expect(f.exists()).toBeFalsy();
    });

    test('User should NOT be able to delete ANOTHER USER directory from Website preview bucket', async () => {
      const response = await request(stage.http)
        .delete(`/directories/${dirToDelete.directory_uuid}`)
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);

      const d: Directory = await new Directory(
        {},
        stage.context.storage,
      ).populateById(dirToDelete.id);
      expect(d.exists()).toBeTruthy();
    });

    test('User should be able to delete directory from Website preview bucket', async () => {
      const response = await request(stage.http)
        .delete(`/directories/${dirToDelete.directory_uuid}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      const d: Directory = await new Directory(
        {},
        stage.context.storage,
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
        stage.context.storage,
      ).populateFilesInBucket(testWebsite.bucket.id, stage.context.storage);
      expect(filesInBucket.length).toBe(0);
    });

    test('User should NOT be able to clear ANOTHER USER bucket content', async () => {
      const response = await request(stage.http)
        .delete(`/buckets/${testWebsite.bucket.id}/content`)
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });
  });
  describe('Website credit payment tests', () => {
    test('User should receive status 402 when not enough credits is available for project', async () => {
      const projectCredit: Credit = await new Credit(
        {},
        stage.context.config,
      ).populateByUUID(testProject2.project_uuid);
      projectCredit.balance = 1;
      await projectCredit.update();

      const response = await request(stage.http)
        .post(`/storage/hosting/website`)
        .send({
          project_uuid: testProject2.project_uuid,
          name: 'My test Website',
        })
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(402);
    });
  });

  describe('Review website tests', () => {
    let freemiumProject: Project;
    let testWebsite: Website;
    let deployment_uuid: string;
    beforeAll(async () => {
      freemiumProject = await createTestProject(testUser, stage);

      //Create test Website record
      testWebsite = await new Website({}, stage.context.storage)
        .populate({
          project_uuid: freemiumProject.project_uuid,
          name: 'Test Website',
        })
        .createNewWebsite(stage.context.storage, uuidV4());
    });

    test('User should be able to upload files to website', async () => {
      testSession_uuid = uuidV4();

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
          ],
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);

      expect(response.status).toBe(201);
      const file1Fur = response.body.data.files.find(
        (x) => x.fileName == 'index.html',
      );

      response = await request(file1Fur.url)
        .put(``)
        .send(
          `<h1>This is test page, that will go to review. Curr date: ${new Date().toString()}</h1>`,
        );
      expect(response.status).toBe(200);

      response = await request(stage.http)
        .post(
          `/storage/${testWebsite.bucket.bucket_uuid}/file-upload/${testSession_uuid}/end`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
    });

    test('User should be able to deploy Website to staging', async () => {
      const response = await request(stage.http)
        .post(`/storage/hosting/websites/${testWebsite.website_uuid}/deploy`)
        .send({
          environment: 1,
          directDeploy: true,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.deployment_uuid).toBeTruthy();
      deployment_uuid = response.body.data.deployment_uuid;

      //deployment should be in review
      const deployment = await new Deployment(
        {},
        stage.context.storage,
      ).populateByUUID(response.body.data.deployment_uuid, 'deployment_uuid');

      expect(deployment.exists()).toBeTruthy();
      expect(deployment.deploymentStatus).toBe(DeploymentStatus.IN_REVIEW);
    });

    test('Until website deployment is not confirmed, CID and other website properties should be null or still on previous deployment version', async () => {
      const response = await request(stage.http)
        .get(`/storage/hosting/websites/${testWebsite.website_uuid}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.ipnsStaging).toBeFalsy();

      const stagingBucket = await new Bucket(
        {},
        stage.context.storage,
      ).populateById(testWebsite.stagingBucket_id);

      expect(stagingBucket.exists()).toBeTruthy();
      expect(stagingBucket.CID).toBeFalsy();
    });

    test('Admin should be able to approve website deployment', async () => {
      const token = generateJwtToken(JwtTokenType.WEBSITE_REVIEW_TOKEN, {
        deployment_uuid,
      });
      const response = await request(stage.http).get(
        `/storage/hosting/websites/${testWebsite.website_uuid}/deployments/${deployment_uuid}/approve?token=${token}`,
      );
      expect(response.status).toBe(200);

      const deployment = await new Deployment(
        {},
        stage.context.storage,
      ).populateByUUID(deployment_uuid, 'deployment_uuid');
      expect(deployment.deploymentStatus).toBe(DeploymentStatus.SUCCESSFUL);
    });

    test('Admin should recieve error if deployment was already approved or rejected', async () => {
      const token = generateJwtToken(JwtTokenType.WEBSITE_REVIEW_TOKEN, {
        deployment_uuid,
      });
      const response = await request(stage.http).get(
        `/storage/hosting/websites/${testWebsite.website_uuid}/deployments/${deployment_uuid}/approve?token=${token}`,
      );
      expect(response.status).toBe(409);
    });

    test('If deployment is confirmed, CID and other website properties should have value, and website should be accessible through ipns address', async () => {
      const response = await request(stage.http)
        .get(`/storage/hosting/websites/${testWebsite.website_uuid}`)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      const stagingBucket = await new Bucket(
        {},
        stage.context.storage,
      ).populateById(testWebsite.stagingBucket_id);

      expect(stagingBucket.exists()).toBeTruthy();
      expect(stagingBucket.CID).toBeTruthy();

      //Test if website is accessible on ipfs
      const ipfsCluster = await new ProjectConfig(
        { project_uuid: testWebsite.project_uuid },
        stage.context.storage,
      ).getIpfsCluster();

      const ipnsLink = ipfsCluster.generateLink(
        testWebsite.project_uuid,
        response.body.data.ipnsStaging,
        true,
      );

      const websiteResponse = await request(ipnsLink).get('');
      expect(websiteResponse.status).toBe(200);
    });

    test('Admin should be able to reject website deployment', async () => {
      //Create another deployment
      const response = await request(stage.http)
        .post(`/storage/hosting/websites/${testWebsite.website_uuid}/deploy`)
        .send({
          environment: 1,
          directDeploy: true,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.deployment_uuid).toBeTruthy();
      deployment_uuid = response.body.data.deployment_uuid;

      const tmpDeployment = await new Deployment(
        {},
        stage.context.storage,
      ).populateByUUID(deployment_uuid, 'deployment_uuid');

      //Set status to in review - deployment might be in some other status (deployed, because this content was already deployed in previous tests)
      tmpDeployment.deploymentStatus = DeploymentStatus.IN_REVIEW;
      tmpDeployment.update();

      //Reject deployment
      const token = generateJwtToken(JwtTokenType.WEBSITE_REVIEW_TOKEN, {
        deployment_uuid,
      });
      const rejectWebsiteResponse = await request(stage.http).get(
        `/storage/hosting/websites/${testWebsite.website_uuid}/deployments/${deployment_uuid}/reject?token=${token}`,
      );
      expect(rejectWebsiteResponse.status).toBe(200);

      //Check deployment status
      const deployment = await new Deployment(
        {},
        stage.context.storage,
      ).populateByUUID(response.body.data.deployment_uuid, 'deployment_uuid');
      expect(deployment.deploymentStatus).toBe(DeploymentStatus.REJECTED);
    });
  });
});
