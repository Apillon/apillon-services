import { ApiKey } from '@apillon/access/src/modules/api-key/models/api-key.model';
import { Project } from '@apillon/dev-console-api/src/modules/project/models/project.model';
import { Service } from '@apillon/dev-console-api/src/modules/services/models/service.model';
import {
  ApiKeyRoleBaseDto,
  AttachedServiceType,
  DefaultApiKeyRole,
} from '@apillon/lib';
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
import { setupTest } from '../../../../test/helpers/setup';

describe('Computing API tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testProject: Project;
  let testService: Service;
  let apiKey: ApiKey;
  let authorization: string;
  let contractUuid: string;

  beforeAll(async () => {
    stage = await setupTest();

    // Set up test user and project
    testUser = await createTestUser(stage.devConsoleContext, stage.amsContext);
    testProject = await createTestProject(testUser, stage, 1200, 2);
    testService = await createTestProjectService(
      stage.devConsoleContext,
      testProject,
    );

    // Generate an API key for testing
    apiKey = await createTestApiKey(stage.amsContext, testProject.project_uuid);
    await apiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_EXECUTE,
        project_uuid: testProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.COMPUTING,
      }),
    );
    await apiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_READ,
        project_uuid: testProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.COMPUTING,
      }),
    );
    await apiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_WRITE,
        project_uuid: testProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.COMPUTING,
      }),
    );
    authorization = `Basic ${Buffer.from(
      `${apiKey.apiKey}:${apiKey.apiKeySecret}`,
    ).toString('base64')}`;
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Computing contract API tests', () => {
    test('API should be able to create a new computing contract', async () => {
      const response = await request(stage.http)
        .post(`/computing/contracts`)
        .send({
          name: 'My Computing Contract',
          contractType: 1,
          contractData: {
            nftContractAddress: '0xB601A99a1D1804c13780F9e53d661d8bEe6D3bF1',
            nftChainRpcUrl: 'https://rpc.api.moonbeam.network/',
          },
        })
        .set('Authorization', authorization);
      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('My Computing Contract');
      expect(response.body.data.contractType).toBe(1);
      expect(response.body.data.restrictToOwner).toEqual(true);
      contractUuid = response.body.data.contractUuid;
      expect(contractUuid).toBeTruthy();
    });

    test('API should be able to create a new computing contract with existing bucket', async () => {
      const bucket_uuid = '6d39c541-5f9c-4255-97e0-8c0734c2e315';
      const response = await request(stage.http)
        .post(`/computing/contracts`)
        .send({
          name: 'My Computing Contract 2',
          bucket_uuid,
          contractType: 1,
          contractData: {
            nftContractAddress: '0xB601A99a1D1804c13780F9e53d661d8bEe6D3bF1',
            nftChainRpcUrl: 'https://rpc.api.moonbeam.network/',
          },
        })
        .set('Authorization', authorization);
      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('My Computing Contract 2');
      expect(response.body.data.bucket_uuid).toBe(bucket_uuid);
    });

    test('API should NOT be able to create a new contract with missing data', async () => {
      const response = await request(stage.http)
        .post(`/computing/contracts`)
        .send({
          contractType: 1,
        })
        .set('Authorization', authorization);

      expect(response.status).toBe(422);
    });

    test('API should be able to list all computing contracts', async () => {
      const response = await request(stage.http)
        .get(`/computing/contracts`)
        .set('Authorization', authorization);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBeGreaterThanOrEqual(1);
      expect(
        response.body.data.items.some(
          (item) => item.contractUuid === contractUuid,
        ),
      );
    });

    test('Application should be able to retrieve details of a specific computing contract', async () => {
      const response = await request(stage.http)
        .get(`/computing/contracts/${contractUuid}`)
        .set('Authorization', authorization);
      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        contractUuid,
        name: 'My Computing Contract',
        contractType: 1,
      });
    });

    test('API should be able to list transactions for a specific computing contract', async () => {
      let response = await request(stage.http)
        .get(`/computing/contracts/${contractUuid}/transactions`)
        .set('Authorization', authorization);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBeGreaterThanOrEqual(1);

      // List transactions only of a certain type
      response = await request(stage.http)
        .get(
          `/computing/contracts/${contractUuid}/transactions?transactionType=1`,
        )
        .set('Authorization', authorization);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toEqual(1);
      expect(response.body.data.items[0].transactionType).toEqual(1);
    });

    test('API should be able to encrypt content via a computing contract', async () => {
      const response = await request(stage.http)
        .post(`/computing/contracts/${contractUuid}/encrypt`)
        .send({ content: 'Hello World' })
        .set('Authorization', authorization);
      expect(response.status).toBe(201);
      expect(response.body.data.encryptedContent).toBeTruthy();
    });

    test('API should be able to assign a CID to an NFT within a computing contract', async () => {
      const response = await request(stage.http)
        .post(`/computing/contracts/${contractUuid}/assign-cid-to-nft`)
        .send({
          cid: 'QmVzdyVmz4irpyKfXYEuCP43xxoom4bwedAMrvBA31xVcX',
          nftId: 22,
        })
        .set('Authorization', authorization);
      expect(response.status).toBe(201);
      expect(response.body.data.success).toBeTruthy();
    });

    test('API should be able to transfer ownership of a computing contract', async () => {
      const response = await request(stage.http)
        .post(`/computing/contracts/${contractUuid}/transfer-ownership`)
        .send({
          accountAddress: '43cPs4dWRNwfrqzMPKFQjewvkx6djemjbzwa1ZzYZcwe2TdM',
        })
        .set('Authorization', authorization);
      expect(response.status).toBe(200);
    });
  });
});
