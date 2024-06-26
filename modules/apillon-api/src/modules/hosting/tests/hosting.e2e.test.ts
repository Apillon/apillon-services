import { ApiKey } from '@apillon/access/src/modules/api-key/models/api-key.model';
import { run as generateSystemApiKey } from '@apillon/access/src/scripts/utils/generate-system-api-key';
import { Project } from '@apillon/dev-console-api/src/modules/project/models/project.model';
import { Service } from '@apillon/dev-console-api/src/modules/services/models/service.model';
import {
  ApiKeyRoleBaseDto,
  AttachedServiceType,
  DefaultApiKeyRole,
} from '@apillon/lib';
import { ProjectConfig } from '@apillon/storage/src/modules/config/models/project-config.model';
import { Directory } from '@apillon/storage/src/modules/directory/models/directory.model';
import { Website } from '@apillon/storage/src/modules/hosting/models/website.model';
import { File } from '@apillon/storage/src/modules/storage/models/file.model';
import {
  Stage,
  TestUser,
  createTestApiKey,
  createTestProject,
  createTestProjectService,
  createTestUser,
  releaseStage,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { v4 as uuidV4 } from 'uuid';
import { setupTest } from '../../../../test/helpers/setup';

describe('Apillon API hosting tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testProject: Project;
  let testService: Service;
  let apiKey: ApiKey = undefined;

  let testUser2: TestUser;
  let testProject2: Project;
  let testService2: Service;

  let apiKey2: ApiKey = undefined;

  let testWebsite: Website;
  let testSession_uuid: string;

  let file1FURRes;
  let file2FURRes;
  let file3FURRes;

  beforeAll(async () => {
    stage = await setupTest();
    //User 1 project & other data
    testUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );

    testProject = await createTestProject(testUser, stage, 1200, 2);
    testService = await createTestProjectService(
      stage.context.devConsole,
      testProject,
    );

    //Create test web page record
    testWebsite = await new Website({}, stage.context.storage)
      .populate({
        project_uuid: testProject.project_uuid,
        name: 'Test web page',
        domain: 'https://hosting-e2e-tests.si',
      })
      .createNewWebsite(stage.context.storage, uuidV4());

    apiKey = await createTestApiKey(
      stage.context.access,
      testProject.project_uuid,
    );
    await apiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_EXECUTE,
        project_uuid: testProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.HOSTING,
      }),
    );
    await apiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_READ,
        project_uuid: testProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.HOSTING,
      }),
    );
    await apiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_WRITE,
        project_uuid: testProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.HOSTING,
      }),
    );

    //User 2 project & other data
    testUser2 = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    testProject2 = await createTestProject(testUser2, stage, 1200, 2);
    testService2 = await createTestProjectService(
      stage.context.devConsole,
      testProject2,
    );

    apiKey2 = await createTestApiKey(
      stage.context.access,
      testProject2.project_uuid,
    );
    await apiKey2.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_EXECUTE,
        project_uuid: testProject2.project_uuid,
        service_uuid: testService2.service_uuid,
        serviceType_id: AttachedServiceType.HOSTING,
      }),
    );
    await apiKey2.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_READ,
        project_uuid: testProject2.project_uuid,
        service_uuid: testService2.service_uuid,
        serviceType_id: AttachedServiceType.HOSTING,
      }),
    );
    await apiKey2.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_WRITE,
        project_uuid: testProject2.project_uuid,
        service_uuid: testService2.service_uuid,
        serviceType_id: AttachedServiceType.HOSTING,
      }),
    );
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Apillon API upload files to hosting bucket tests', () => {
    test('Application (through Apillon API) should be able to recieve multiple S3 signed URLs, used to upload files to S3', async () => {
      let response = await request(stage.http)
        .post(`/hosting/websites/${testWebsite.website_uuid}/upload`)
        .send({
          files: [
            {
              fileName: 'index.html',
              contentType: 'text/html',
            },
            {
              fileName: 'styles.css',
              path: 'assets/',
            },
          ],
        })
        .set(
          'Authorization',
          `Basic ${Buffer.from(
            apiKey.apiKey + ':' + apiKey.apiKeySecret,
          ).toString('base64')}`,
        );
      expect(response.status).toBe(201);
      expect(response.body.data.sessionUuid).toBeTruthy();
      testSession_uuid = response.body.data.sessionUuid;

      expect(response.body.data.files).toBeTruthy();
      expect(response.body.data.files.length).toBe(2);

      file1FURRes = response.body.data.files.find(
        (x) => x.fileName == 'index.html',
      );

      file2FURRes = response.body.data.files.find(
        (x) => x.fileName == 'styles.css',
      );

      response = await request(file1FURRes.url)
        .put(``)
        .send(
          `<h1>Welcome to my test page. Curr date: ${new Date().toString()}</h1>`,
        );
      expect(response.status).toBe(200);

      response = await request(file2FURRes.url)
        .put(``)
        .send(
          `h1 {
            font-size: 40px;
          }`,
        );
      expect(response.status).toBe(200);
    });

    test('Application (through Apillon API) should be able to end session and create files in preview bucket', async () => {
      const response = await request(stage.http)
        .post(
          `/hosting/websites/${testWebsite.website_uuid}/upload/${testSession_uuid}/end`,
        )
        .set(
          'Authorization',
          `Basic ${Buffer.from(
            apiKey.apiKey + ':' + apiKey.apiKeySecret,
          ).toString('base64')}`,
        );
      expect(response.status).toBe(200);

      //check if files were created in bucket
      const file: File = await new File(
        {},
        stage.context.storage,
      ).populateByUUID(file1FURRes.fileUuid);

      expect(file.exists()).toBeTruthy();
      expect(file.bucket_id).toBe(testWebsite.bucket_id);
    });

    test('Application (through Apillon API) should NOT be able to recieve multiple S3 signed URLs for anther project', async () => {
      const response = await request(stage.http)
        .post(`/hosting/websites/${testWebsite.website_uuid}/upload`)
        .send({
          files: [
            {
              fileName: 'index.html',
              contentType: 'text/html',
            },
          ],
        })
        .set(
          'Authorization',
          `Basic ${Buffer.from(
            apiKey2.apiKey + ':' + apiKey2.apiKeySecret,
          ).toString('base64')}`,
        );
      expect(response.status).toBe(403);
      expect(response.body.message).toBe(
        'Insufficient permissions to access this record',
      );
    });
  });
  describe('Apillon API deploy page and get deployments tests', () => {
    let deploymentUuid;
    test('Application (through Apillon API) should be able to deploy web page to staging', async () => {
      const response = await request(stage.http)
        .post(`/hosting/websites/${testWebsite.website_uuid}/deploy`)
        .send({
          environment: 1,
          directDeploy: true,
        })
        .set(
          'Authorization',
          `Basic ${Buffer.from(
            apiKey.apiKey + ':' + apiKey.apiKeySecret,
          ).toString('base64')}`,
        );
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

      //Check if source bucket was cleared
      const filesInBucketForUpload = await new File(
        {},
        stage.context.storage,
      ).populateFilesInBucket(testWebsite.bucket_id, stage.context.storage);
      expect(filesInBucketForUpload.length).toBe(0);
    });

    test('Application (through Apillon API) should be able to deploy web page to production', async () => {
      const response = await request(stage.http)
        .post(`/hosting/websites/${testWebsite.website_uuid}/deploy`)
        .send({
          environment: 2,
          directDeploy: true,
        })
        .set(
          'Authorization',
          `Basic ${Buffer.from(
            apiKey.apiKey + ':' + apiKey.apiKeySecret,
          ).toString('base64')}`,
        );
      expect(response.status).toBe(200);
      expect(response.body.data.deploymentUuid).toBeTruthy();
      expect(response.body.data.deploymentStatus).toBe(0);
      expect(response.body.data.number).toBe(1);

      deploymentUuid = response.body.data.deploymentUuid;

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

    test('Application (through Apillon API) should NOT be able to deploy ANOTHER user web page to staging', async () => {
      const response = await request(stage.http)
        .post(`/hosting/websites/${testWebsite.website_uuid}/deploy`)
        .send({
          environment: 1,
          directDeploy: true,
        })
        .set(
          'Authorization',
          `Basic ${Buffer.from(
            apiKey2.apiKey + ':' + apiKey2.apiKeySecret,
          ).toString('base64')}`,
        );
      expect(response.status).toBe(403);
    });

    test('Application (through Apillon API) should be able to get deployment', async () => {
      const response = await request(stage.http)
        .get(
          `/hosting/websites/${testWebsite.website_uuid}/deployments/${deploymentUuid}`,
        )
        .set(
          'Authorization',
          `Basic ${Buffer.from(
            apiKey.apiKey + ':' + apiKey.apiKeySecret,
          ).toString('base64')}`,
        );
      expect(response.status).toBe(200);
      expect(response.body.data.deploymentUuid).toBeTruthy();
      expect(response.body.data.environment).toBe(2);
      expect(response.body.data.deploymentStatus).toBe(10);
      expect(response.body.data.cid).toBeTruthy();
      expect(response.body.data.size).toBeGreaterThan(0);
      expect(response.body.data.number).toBeGreaterThan(0);
    });
  });
  describe('Apillon API get web page tests', () => {
    let ipnsStagingLink;
    let ipnsProductionLink;

    //Get IPFS cluster

    test('Application (through Apillon API) should be able to get web page', async () => {
      const response = await request(stage.http)
        .get(`/hosting/websites/${testWebsite.website_uuid}`)
        .set(
          'Authorization',
          `Basic ${Buffer.from(
            apiKey.apiKey + ':' + apiKey.apiKeySecret,
          ).toString('base64')}`,
        );
      expect(response.status).toBe(200);
      expect(response.body.data.websiteUuid).toBeTruthy();
      expect(response.body.data.name).toBe('Test web page');
      expect(response.body.data.domain).toBe('https://hosting-e2e-tests.si');
      expect(response.body.data.bucketUuid).toBeTruthy();
      expect(response.body.data.ipnsStaging).toBeTruthy();
      expect(response.body.data.ipnsProduction).toBeTruthy();

      const ipfsCluster = await new ProjectConfig(
        { project_uuid: testWebsite.project_uuid },
        stage.context.storage,
      ).getIpfsCluster();

      ipnsStagingLink = ipfsCluster.generateLink(
        testWebsite.project_uuid,
        response.body.data.ipnsStaging,
        true,
      );
      ipnsProductionLink = ipfsCluster.generateLink(
        testWebsite.project_uuid,
        response.body.data.ipnsProduction,
        true,
      );
    });

    test('Application (through Apillon API) should be able to view staging web page via IPNS', async () => {
      expect(ipnsStagingLink).toBeTruthy();
      const response = await request(ipnsStagingLink).get('');
      expect(response.status).toBe(200);
    });

    test('Application (through Apillon API) should be able to view production web page via IPNS', async () => {
      expect(ipnsProductionLink).toBeTruthy();
      const response = await request(ipnsProductionLink).get('');
      expect(response.status).toBe(200);
    });
  });

  describe('Apillon API update web page content and redeploy tests', () => {
    const indexPageContent = `<h1>Welcome to my NEW test page. Curr date: ${new Date().toString()}</h1>`;
    test('Application (through Apillon API) should be able to recieve multiple NEW S3 signed URLs, used to upload files to S3', async () => {
      let response = await request(stage.http)
        .post(`/hosting/websites/${testWebsite.website_uuid}/upload`)
        .send({
          files: [
            {
              fileName: 'index.html',
              contentType: 'text/html',
            },
            {
              fileName: 'home.html',
              contentType: 'text/html',
            },
            {
              fileName: 'styles.css',
              path: 'assets/',
            },
          ],
        })
        .set(
          'Authorization',
          `Basic ${Buffer.from(
            apiKey.apiKey + ':' + apiKey.apiKeySecret,
          ).toString('base64')}`,
        );
      expect(response.status).toBe(201);
      expect(response.body.data.sessionUuid).toBeTruthy();
      expect(response.body.data.files.length).toBe(3);
      testSession_uuid = response.body.data.sessionUuid;

      file1FURRes = response.body.data.files.find(
        (x) => x.fileName == 'index.html',
      );
      file2FURRes = response.body.data.files.find(
        (x) => x.fileName == 'styles.css',
      );
      file3FURRes = response.body.data.files.find(
        (x) => x.fileName == 'home.html',
      );

      response = await request(file1FURRes.url).put(``).send(indexPageContent);
      expect(response.status).toBe(200);

      response = await request(file2FURRes.url)
        .put(``)
        .send(
          `h1 {
              font-size: 45px;
            }`,
        );
      expect(response.status).toBe(200);

      response = await request(file3FURRes.url)
        .put(``)
        .send(`This is my home page`);
      expect(response.status).toBe(200);
    });

    test('Application (through Apillon API) should be able to end NEW session and create files in preview bucket', async () => {
      const response = await request(stage.http)
        .post(
          `/hosting/websites/${testWebsite.website_uuid}/upload/${testSession_uuid}/end`,
        )
        .set(
          'Authorization',
          `Basic ${Buffer.from(
            apiKey.apiKey + ':' + apiKey.apiKeySecret,
          ).toString('base64')}`,
        );
      expect(response.status).toBe(200);

      //check if files were created in bucket
      const filesInBucket = await new File(
        {},
        stage.context.storage,
      ).populateFilesInBucket(testWebsite.bucket_id, stage.context.storage);
      expect(filesInBucket.length).toBe(3);
    });

    test('Application (through Apillon API) should be able to deploy NEW web page content to staging', async () => {
      const response = await request(stage.http)
        .post(`/hosting/websites/${testWebsite.website_uuid}/deploy`)
        .send({
          environment: 1,
          directDeploy: true,
        })
        .set(
          'Authorization',
          `Basic ${Buffer.from(
            apiKey.apiKey + ':' + apiKey.apiKeySecret,
          ).toString('base64')}`,
        );
      expect(response.status).toBe(200);

      //check if files were created in staging bucket and have CID
      const filesInBucket = await new File(
        {},
        stage.context.storage,
      ).populateFilesInBucket(
        testWebsite.stagingBucket_id,
        stage.context.storage,
      );
      expect(filesInBucket.length).toBe(3);
      expect(filesInBucket[0].CID).toBeTruthy();

      const tmpWebsite: Website = await new Website(
        {},
        stage.context.storage,
      ).populateById(testWebsite.id);
      await tmpWebsite.populateBucketsAndLink();
      //check that staging bucket CID is different than production bucket CID (production is stil in previous version)
      expect(tmpWebsite.stagingBucket.CID).not.toBe(
        tmpWebsite.productionBucket.CID,
      );
    });

    test('Application (through Apillon API) should be able to deploy NEW web page content to production', async () => {
      let response = await request(stage.http)
        .post(`/hosting/websites/${testWebsite.website_uuid}/deploy`)
        .send({
          environment: 2,
          directDeploy: true,
        })
        .set(
          'Authorization',
          `Basic ${Buffer.from(
            apiKey.apiKey + ':' + apiKey.apiKeySecret,
          ).toString('base64')}`,
        );
      expect(response.status).toBe(200);

      //check if files were created in production bucket and have CID
      const filesInBucket = await new File(
        {},
        stage.context.storage,
      ).populateFilesInBucket(
        testWebsite.productionBucket_id,
        stage.context.storage,
      );
      expect(filesInBucket.length).toBe(3);
      expect(filesInBucket[0].CID).toBeTruthy();

      const tmpWebsite: Website = await new Website(
        {},
        stage.context.storage,
      ).populateById(testWebsite.id);
      await tmpWebsite.populateBucketsAndLink();
      //check that staging bucket CID is same as production bucket CID
      expect(tmpWebsite.stagingBucket.CID).toBe(
        tmpWebsite.productionBucket.CID,
      );

      const ipfsCluster = await new ProjectConfig(
        { project_uuid: tmpWebsite.project_uuid },
        stage.context.storage,
      ).getIpfsCluster();

      //Check, that index.html page was updated
      response = await request(
        ipfsCluster.generateLink(
          tmpWebsite.project_uuid,
          tmpWebsite.productionBucket.CID,
          false,
          'index.html/',
        ),
      ).get('');
      expect(response.status).toBe(200);
      expect(response.text).toBe(indexPageContent);
    });
  });

  describe('Apillon API direct deploy tests', () => {
    let directDeployTestWebsite;
    beforeAll(async () => {
      //create new website
      directDeployTestWebsite = await new Website({}, stage.context.storage)
        .populate({
          project_uuid: testProject.project_uuid,
          name: 'Direct deploy test website',
        })
        .createNewWebsite(stage.context.storage, uuidV4());
    });
    test('Application (through Apillon API) should be able to deploy directly to production', async () => {
      let response = await request(stage.http)
        .post(
          `/hosting/websites/${directDeployTestWebsite.website_uuid}/upload`,
        )
        .send({
          files: [
            {
              fileName: 'index.html',
              contentType: 'text/html',
            },
          ],
        })
        .set(
          'Authorization',
          `Basic ${Buffer.from(
            apiKey.apiKey + ':' + apiKey.apiKeySecret,
          ).toString('base64')}`,
        );
      expect(response.status).toBe(201);
      expect(response.body.data.sessionUuid).toBeTruthy();
      testSession_uuid = response.body.data.sessionUuid;

      file1FURRes = response.body.data.files.find(
        (x) => x.fileName == 'index.html',
      );

      response = await request(file1FURRes.url)
        .put(``)
        .send(
          `<h1>Testing direct deploy to production. Curr date: ${new Date().toString()}</h1>`,
        );
      expect(response.status).toBe(200);

      response = await request(stage.http)
        .post(
          `/hosting/websites/${directDeployTestWebsite.website_uuid}/upload/${testSession_uuid}/end`,
        )
        .set(
          'Authorization',
          `Basic ${Buffer.from(
            apiKey.apiKey + ':' + apiKey.apiKeySecret,
          ).toString('base64')}`,
        );
      expect(response.status).toBe(200);

      response = await request(stage.http)
        .post(
          `/hosting/websites/${directDeployTestWebsite.website_uuid}/deploy`,
        )
        .send({
          environment: 3,
          directDeploy: true,
        })
        .set(
          'Authorization',
          `Basic ${Buffer.from(
            apiKey.apiKey + ':' + apiKey.apiKeySecret,
          ).toString('base64')}`,
        );
      expect(response.status).toBe(200);

      //check if files were created in staging bucket and have CID
      const filesInBucket = await new File(
        {},
        stage.context.storage,
      ).populateFilesInBucket(
        directDeployTestWebsite.productionBucket_id,
        stage.context.storage,
      );
      expect(filesInBucket.length).toBe(1);
      expect(filesInBucket[0].CID).toBeTruthy();
    });
  });
  describe('Apillon API list domains tests', () => {
    let systemApiKey: { key: string; secret: string };
    beforeAll(async () => {
      systemApiKey = await generateSystemApiKey();
    });
    test('Application (through Apillon API) should be able to get domain list', async () => {
      const response = await request(stage.http)
        .get(`/hosting/domains`)
        .set(
          'Authorization',
          `Basic ${Buffer.from(
            systemApiKey.key + ':' + systemApiKey.secret,
          ).toString('base64')}`,
        );
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('Application (through Apillon API) should NOT be able to get domain list without valid SYSTEM_GENERAL key', async () => {
      const response = await request(stage.http)
        .get(`/hosting/domains`)
        .set(
          'Authorization',
          `Basic ${Buffer.from(
            apiKey.apiKey + ':' + apiKey.apiKeySecret,
          ).toString('base64')}`,
        );
      expect(response.status).toBe(403);
    });

    test('Application (through Apillon API) should NOT be able to get domain list without key', async () => {
      const response = await request(stage.http).get(`/hosting/domains`);
      expect(response.status).toBe(400);
    });
  });
});
