import { Endpoint } from '@apillon/blockchain/src/common/models/endpoint';
import { Wallet } from '@apillon/blockchain/src/modules/wallet/wallet.model';
import { ChainType, EvmChain } from '@apillon/lib';
import {
  Stage,
  createTestProject,
  createTestUser,
  getConfig,
  releaseStage,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { setupTest } from '../../../../test/helpers/setup';
import { EmbeddedWalletIntegration } from '@apillon/authentication/src/modules/embedded-wallet/models/embedded-wallet-integration.model';
import { v4 as uuid } from 'uuid';

describe('Embedded wallet tests', () => {
  let config: any;
  let stage: Stage;

  let testUser;
  let testProject;
  let testIntegration: EmbeddedWalletIntegration;
  const data =
    '0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000022000000000000000000000000000000000000000000000000000000000000000202df26e9fe9bb71ba3424ec9368cfda2de5e6b38f1da3c1b909739c48004ebc0100000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000…000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000843078303463646561383266303030303331643038656566616431613135376536663137303939326533373832376530316633336566666537323934623839666631623062323534313461366634383034353735376666353361346663636337343638643365346437356465623662396437636137646133363438303138393634366536610000000000000000000000000000000000000000000';

  beforeAll(async () => {
    config = await getConfig();
    stage = await setupTest();

    //Insert endpoint
    await new Endpoint({}, stage.context.blockchain)
      .populate({
        url: 'https://testnet.sapphire.oasis.io',
        chain: EvmChain.OASIS_TESTNET,
        chainType: ChainType.EVM,
      })
      .insert();

    //Insert wallet
    await new Wallet(
      {
        chain: EvmChain.OASIS_TESTNET,
        chainType: ChainType.EVM,
        address: config.oasis.wallet.address,
        seed: config.oasis.wallet.seed,
        blockParseSize: 50,
        lastParsedBlock: 0,
      },
      stage.context.blockchain,
    ).insert();

    testUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    testProject = await createTestProject(testUser, stage);

    testIntegration = await new EmbeddedWalletIntegration(
      {
        integration_uuid: uuid(),
        project_uuid: testProject.project_uuid,
        title: 'Test EW integration',
        description: 'Test description',
        whitelistedDomains:
          'valid-domain.com,*.valid-domain2.com,subdomain.*.valid-domain3.com',
      },
      stage.context.authentication,
    ).insert();

    //2. project integration
    await new EmbeddedWalletIntegration(
      {
        integration_uuid: 'Some_other_integration_uuid',
        project_uuid: 'Some_other_project_uuid',
        title: 'Another EW integration',
      },
      stage.context.authentication,
    ).insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Signature creation tests', () => {
    test('Application should receive 422 error if missing required data', async () => {
      const response = await request(stage.http)
        .post(`/embedded-wallet/signature`)
        .send({ integration_uuid: testIntegration.integration_uuid });
      expect(response.status).toBe(422);
    });

    test('Application should receive error if sending invalid integration_uuid', async () => {
      const response = await request(stage.http)
        .post(`/embedded-wallet/signature`)
        .send({
          integration_uuid: 'non existing integration',
          data,
        });
      expect(response.status).toBe(404);
    });

    test('Application should be able to generate signature for embedded wallet sdk', async () => {
      const response = await request(stage.http)
        .post(`/embedded-wallet/signature`)
        .set('Origin', 'https://valid-domain.com')
        .send({
          integration_uuid: testIntegration.integration_uuid,
          data,
        });
      expect(response.status).toBe(200);
      expect(response.body.data.signature).toBeTruthy();

      //signature hash should be saved to DB
      const dbData = await stage.db.authentication.paramExecute(
        `
    SELECT COUNT(*) as numOfSignatures
    FROM \`oasis_signature\`;
    `,
        {},
      );
      expect(dbData[0].numOfSignatures).toBe(1);
    });

    describe('Domain whitelist tests', () => {
      test('Request without origin should return error', async () => {
        const response = await request(stage.http)
          .post(`/embedded-wallet/signature`)
          .send({
            integration_uuid: testIntegration.integration_uuid,
            data,
          });
        expect(response.status).toBe(403);
        expect(response.body.message).toBe(
          'EMBEDDED_WALLET_INTEGRATION_DOMAIN_NOT_WHITELISTED',
        );
      });

      test('Request with unlisted origin should return error', async () => {
        const response = await request(stage.http)
          .post(`/embedded-wallet/signature`)
          .set('Origin', 'https://invalid-domain.com')
          .send({
            integration_uuid: testIntegration.integration_uuid,
            data,
          });
        expect(response.status).toBe(403);
        expect(response.body.message).toBe(
          'EMBEDDED_WALLET_INTEGRATION_DOMAIN_NOT_WHITELISTED',
        );
      });

      test('Request with whitelisted origin should succeed', async () => {
        const response = await request(stage.http)
          .post(`/embedded-wallet/signature`)
          .set('Origin', 'https://valid-domain.com')
          .send({
            integration_uuid: testIntegration.integration_uuid,
            data,
          });
        expect(response.status).toBe(200);
        expect(response.body.data.signature).toBeTruthy();

        // Signature hash should be saved to DB
        const dbData = await stage.db.authentication.paramExecute(
          `
      SELECT COUNT(*) as numOfSignatures
      FROM \`oasis_signature\`;
      `,
          {},
        );
        expect(dbData[0].numOfSignatures).toBe(2);
      });
    });

    test('Request with exact whitelisted domain should succeed', async () => {
      const response = await request(stage.http)
        .post(`/embedded-wallet/signature`)
        .set('Origin', 'https://valid-domain.com')
        .send({
          integration_uuid: testIntegration.integration_uuid,
          data,
        });
      expect(response.status).toBe(200);
      expect(response.body.data.signature).toBeTruthy();
    });

    test('Request with wildcard subdomain should succeed', async () => {
      const response = await request(stage.http)
        .post(`/embedded-wallet/signature`)
        .set('Origin', 'https://sub.valid-domain2.com')
        .send({
          integration_uuid: testIntegration.integration_uuid,
          data,
        });
      expect(response.status).toBe(200);
      expect(response.body.data.signature).toBeTruthy();
    });

    test('Request with wildcard in middle of domain should succeed', async () => {
      const response = await request(stage.http)
        .post(`/embedded-wallet/signature`)
        .set('Origin', 'https://subdomain.anything.valid-domain3.com')
        .send({
          integration_uuid: testIntegration.integration_uuid,
          data,
        });
      expect(response.status).toBe(200);
      expect(response.body.data.signature).toBeTruthy();
    });
  });
});
