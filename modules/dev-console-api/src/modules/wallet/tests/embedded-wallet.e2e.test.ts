import { OasisSignature } from '@apillon/authentication/src/modules/embedded-wallet/models/oasis-signature.model';
import { QuotaCode, SqlModelStatus } from '@apillon/lib';
import {
  Stage,
  TestUser,
  createTestProject,
  createTestUser,
  releaseStage,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { setupTest } from '../../../../test/helpers/setup';
import { Project } from '../../project/models/project.model';
import { EmbeddedWalletIntegration } from '@apillon/authentication/src/modules/embedded-wallet/models/embedded-wallet-integration.model';
import { v4 as uuid } from 'uuid';
import { Override } from '@apillon/config/src/modules/override/models/override.model';

describe('Embedded wallet tests', () => {
  let stage: Stage;

  let testUser: TestUser;
  let testUser2: TestUser;

  let testProject: Project;

  let testIntegration: EmbeddedWalletIntegration;
  let testOasisSignature: OasisSignature;

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

    testProject = await createTestProject(testUser, stage, 5000);

    //Insert some test embedded wallet integrations and signatures
    testIntegration = await new EmbeddedWalletIntegration(
      {
        integration_uuid: uuid(),
        project_uuid: testProject.project_uuid,
        title: 'Test EW integration',
        description: 'Test description',
      },
      stage.context.authentication,
    ).insert();

    testOasisSignature = await new OasisSignature(
      {},
      stage.context.authentication,
    )
      .populate({
        embeddedWalletIntegration_id: testIntegration.id,
        project_uuid: testProject.project_uuid,
        dataHash:
          '0xf4688cf1bce1a2b84753ac4f7dd8b0f044ba06666bdf0b379203c3551d569736',
        contractAddress: '0xb1C945890247f9901d66eDa025B00dB7A08FEb72',
        publicAddress: '0x8036c0f2e8f93c5e95168be3fd05e2d2743bbe07',
        status: SqlModelStatus.ACTIVE,
      })
      .insert();

    await new OasisSignature({}, stage.context.authentication)
      .populate({
        embeddedWalletIntegration_id: testIntegration.id,
        project_uuid: testProject.project_uuid,
        dataHash:
          '0x3a757d127a10a22d803b6516e7d7919b056cc5047b56d3d273eb8150387d6963',
        status: SqlModelStatus.INACTIVE,
      })
      .insert();

    //Insert overrides for test project, so if defaults changes, tests still works
    await new Override(
      {
        quota_id: QuotaCode.MAX_EMBEDDED_WALLET_INTEGRATIONS,
        status: SqlModelStatus.ACTIVE,
        project_uuid: testProject.project_uuid,
        value: 2,
      },
      stage.context.config,
    ).insert();

    await new Override(
      {
        quota_id: QuotaCode.MAX_EMBEDDED_WALLET_SIGNATURES,
        status: SqlModelStatus.ACTIVE,
        project_uuid: testProject.project_uuid,
        value: 100,
      },
      stage.context.config,
    ).insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('User should be able to get info about embedded wallet quotas', async () => {
    const response = await request(stage.http)
      .get(`/embedded-wallet/info?project_uuid=${testProject.project_uuid}`)
      .set('Authorization', `Bearer ${testUser.token}`);
    expect(response.status).toBe(200);
    expect(response.body.data.maxNumOfEWIntegrations).toBe(2);
    expect(response.body.data.numOfEWIntegrations).toBe(1);
    expect(response.body.data.maxNumOfEWSignatures).toBe(100);
    expect(response.body.data.numOfEWSignaturesForCurrentMonth).toBe(2);
  });

  describe('Embedded wallet (EW) integration tests', () => {
    test('User should be able to list EW integrations', async () => {
      const response = await request(stage.http)
        .get(
          `/embedded-wallet/integrations?project_uuid=${testProject.project_uuid}`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      const tmpIntegration = response.body.data.items[0];
      expect(tmpIntegration.title).toEqual(testIntegration.title);
      expect(tmpIntegration.description).toEqual(testIntegration.description);
      expect(tmpIntegration.integration_uuid).toEqual(
        testIntegration.integration_uuid,
      );
    });

    test('User should be able to get EW integration by uuid', async () => {
      const response = await request(stage.http)
        .get(
          `/embedded-wallet/integrations/${testIntegration.integration_uuid}`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        integration_uuid: testIntegration.integration_uuid,
        title: testIntegration.title,
        description: testIntegration.description,
        whitelistedDomains: testIntegration.whitelistedDomains,
      });
      expect(response.body.data.usage?.length).toBeGreaterThan(20);
      expect(
        response.body.data.usage.filter((x) => x.countOfSignatures > 0).length,
      ).toBe(1);
    });

    test('User should be able to create new embedded wallet integration', async () => {
      const body = {
        project_uuid: testProject.project_uuid,
        title: 'New test integration',
        description: 'New test integration description',
      };

      const response = await request(stage.http)
        .post(`/embedded-wallet/integration`)
        .send(body)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);
      const tmpUuid = response.body.data.integration_uuid;
      expect(tmpUuid).toBeTruthy();

      const tmpIntegration = await new EmbeddedWalletIntegration(
        {},
        stage.context.authentication,
      ).populateByUUID(tmpUuid, 'integration_uuid');
      expect(tmpIntegration.exists()).toBeTruthy();
      expect(tmpIntegration).toMatchObject(body);
    });

    test('User should NOT be able to create more integrations than the limit is', async () => {
      const body = {
        project_uuid: testProject.project_uuid,
        title: 'New test integration',
        description: 'New test integration description',
      };

      const response = await request(stage.http)
        .post(`/embedded-wallet/integration`)
        .send(body)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(400);
      expect(response.body.code).toBe(40013001);
    });

    test('User should be able to update embedded wallet integration', async () => {
      const body = {
        title: 'Updated title',
        whitelistedDomains: 'test.com,test2.com',
      };

      const response = await request(stage.http)
        .patch(
          `/embedded-wallet/integrations/${testIntegration.integration_uuid}`,
        )
        .send(body)
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      const tmpIntegration = await new EmbeddedWalletIntegration(
        {},
        stage.context.authentication,
      ).populateByUUID(testIntegration.integration_uuid, 'integration_uuid');
      expect(tmpIntegration).toMatchObject(body);
    });

    test('User should be able to get signatures of specific EW integration', async () => {
      const response = await request(stage.http)
        .get(
          `/embedded-wallet/integrations/${testIntegration.integration_uuid}/signatures`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(2);
      const tmpSignature = response.body.data.items.find(
        (x) => x.dataHash == testOasisSignature.dataHash,
      );
      expect(tmpSignature.publicAddress).toBe(testOasisSignature.publicAddress);
      expect(tmpSignature.contractAddress).toBe(
        testOasisSignature.contractAddress,
      );
    });
  });
  describe('Embedded wallet (EW) integration access tests', () => {
    test('User should NOT be able to list EW integrations of another project', async () => {
      const response = await request(stage.http)
        .get(
          `/embedded-wallet/integrations?project_uuid=${testProject.project_uuid}`,
        )
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });

    test('User should NOT be able to get EW integration of another project', async () => {
      const response = await request(stage.http)
        .get(
          `/embedded-wallet/integrations/${testIntegration.integration_uuid}`,
        )
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });

    test('User should be NOT able to create new embedded wallet integration into ANOTHER project', async () => {
      const body = {
        project_uuid: testProject.project_uuid,
        title: 'New test integration',
        description: 'New test integration description',
      };

      const response = await request(stage.http)
        .post(`/embedded-wallet/integration`)
        .send(body)
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });

    test('User should NOT be able to update ANOTHER project embedded wallet integration', async () => {
      const body = {
        title: 'Updated title',
      };

      const response = await request(stage.http)
        .patch(
          `/embedded-wallet/integrations/${testIntegration.integration_uuid}`,
        )
        .send(body)
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });

    test('User should NOT be able to get signatures of specific EW integration of ANOTHER project', async () => {
      const response = await request(stage.http)
        .get(
          `/embedded-wallet/integrations/${testIntegration.integration_uuid}/signatures`,
        )
        .set('Authorization', `Bearer ${testUser2.token}`);
      expect(response.status).toBe(403);
    });
  });
});
