import { ApiKey } from '@apillon/access/src/modules/api-key/models/api-key.model';
import { Project } from '@apillon/dev-console-api/src/modules/project/models/project.model';
import { OauthLinkType, SqlModelStatus } from '@apillon/lib';
import {
  releaseStage,
  Stage,
  generateSystemApiKey,
  TestUser,
  createTestProject,
  createTestUser,
  createTestApiKey,
  createTestBucket,
} from '@apillon/tests-lib';

import * as request from 'supertest';
import { setupTest } from '../../../../test/helpers/setup';
import { IpfsBandwidth } from '@apillon/storage/src/modules/ipfs/models/ipfs-bandwidth';

import { getRequestFactory } from '@apillon/tests-lib/src/lib/helpers/requests';
import { Ipns } from '@apillon/storage/src/modules/ipns/models/ipns.model';

import { v4 as uuidV4 } from 'uuid';

describe('System APIs tests', () => {
  let stage: Stage;
  let getRequest;

  let apiKey: ApiKey = undefined;
  let systemApiKey: ApiKey = undefined;
  let testUser: TestUser;
  let testUser2: TestUser;
  let testUser3: TestUser;
  let testProject: Project;
  let testProject2: Project;
  let testProject3: Project;

  let ipnsRecord: Ipns;

  beforeAll(async () => {
    stage = await setupTest();
    //User 1 project & other data
    testUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    testUser2 = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    testUser3 = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );

    testProject = await createTestProject(testUser, stage);
    testProject2 = await createTestProject(testUser2, stage);

    //Insert one blocked project
    testProject3 = await createTestProject(testUser3, stage);
    testProject3.status = SqlModelStatus.BLOCKED;
    await testProject3.update();

    apiKey = await createTestApiKey(
      stage.context.access,
      testProject.project_uuid,
    );

    systemApiKey = await generateSystemApiKey(stage.context.access);

    getRequest = getRequestFactory(stage.http, systemApiKey);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Access to endpoint tests', () => {
    test('API should not be accessible without api key', async () => {
      const response = await request(stage.http).get(`/system/blocked-on-ipfs`);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Missing Authorization header');
    });

    test('User api key should not work for system api', async () => {
      const response = await request(stage.http)
        .get(`/system/blocked-on-ipfs`)
        .set(
          'Authorization',
          `Basic ${Buffer.from(
            apiKey.apiKey + ':' + apiKey.apiKeySecret,
          ).toString('base64')}`,
        );
      expect(response.status).toBe(403);
    });
  });

  describe('Blocked projects on ipfs tests', () => {
    beforeAll(async () => {
      await new IpfsBandwidth(
        {
          project_uuid: testProject.project_uuid,
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          bandwidth: 15000,
        },
        stage.context.storage,
      ).insert();

      await new IpfsBandwidth(
        {
          project_uuid: testProject2.project_uuid,
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          bandwidth: 5565555555434323,
        },
        stage.context.storage,
      ).insert();
    });

    test('Api should return blocked projects', async () => {
      const response = await getRequest(`/system/blocked-on-ipfs`);

      expect(response.status).toBe(200);
      expect(
        response.body.data.blockedProjects.find(
          (x) => x.projectUuid == testProject3.project_uuid,
        ),
      ).toBeTruthy();
    });

    test('Api should return projects that have reached ipfs bandwidth qouta', async () => {
      const response = await getRequest(`/system/blocked-on-ipfs`);

      expect(response.status).toBe(200);
      expect(
        response.body.data.blockedProjects.find(
          (x) => x.projectUuid == testProject2.project_uuid,
        ),
      ).toBeTruthy();
    });

    test('Api should NOT return projects that are not blocked and above bandwidth limit', async () => {
      const response = await getRequest(`/system/blocked-on-ipfs`);

      expect(response.status).toBe(200);
      expect(
        response.body.data.blockedProjects.find(
          (x) => x.projectUuid == testProject.project_uuid,
        ),
      ).toBeFalsy();
    });
  });

  describe('Get ipns by name tests', () => {
    beforeAll(async () => {
      //Insert an ipns record
      const bucket = await createTestBucket(
        testUser,
        stage.context.storage,
        testProject,
      );
      ipnsRecord = await new Ipns({}, stage.context.storage)
        .populate({
          ipns_uuid: uuidV4(),
          project_uuid: testProject.project_uuid,
          bucket_id: bucket.id,
          name: 'test IPNS record',
          ipnsName: 'k2k4r8lsoq1eximncx437b3cxtsjuq5d6mup9sop78ibfgptxqe052lk',
          ipnsValue: '/ipfs/QmckugtsA4ML1hkUQw4ffoMqDjnMraTSU1YVHttHGf1DfE',
          key: '1f6654ca-f2e7-4378-8f5a-5f04810a0ecc_12_5',
          cid: 'QmckugtsA4ML1hkUQw4ffoMqDjnMraTSU1YVHttHGf1DfE',
        })
        .insert();
    });

    test('Api should return ipns by name', async () => {
      const response = await getRequest(`/system/ipns/${ipnsRecord.ipnsName}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeTruthy();
      const ipnsRes = response.body.data;
      expect(ipnsRes.ipnsUuid).toBe(ipnsRecord.ipns_uuid);
      expect(ipnsRes.ipnsName).toBe(ipnsRecord.ipnsName);
      expect(ipnsRes.ipnsValue).toBe(ipnsRecord.ipnsValue);
      expect(ipnsRes.key).toBe(ipnsRecord.key);
    });

    test('Api should return 404 error if ipns does not exists', async () => {
      const response = await getRequest(`/system/ipns/some-not-existing-ipns`);

      expect(response.status).toBe(404);
    });
  });
});
