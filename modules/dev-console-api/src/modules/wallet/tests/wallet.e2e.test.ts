import { ApiKey } from '@apillon/access/src/modules/api-key/models/api-key.model';
import { OasisSignature } from '@apillon/authentication/src/modules/oasis/models/oasis-signature.model';
import { Endpoint } from '@apillon/blockchain/src/common/models/endpoint';
import { Wallet } from '@apillon/blockchain/src/modules/wallet/wallet.model';
import { ChainType, EvmChain, SqlModelStatus } from '@apillon/lib';
import {
  Stage,
  TestUser,
  createTestApiKey,
  createTestProject,
  createTestUser,
  getConfig,
  releaseStage,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { setupTest } from '../../../../test/helpers/setup';
import { Project } from '../../project/models/project.model';

describe('Wallet tests', () => {
  let stage: Stage;
  let config: any;

  let testUser: TestUser;
  let testUser2: TestUser;

  let testProject: Project;
  let testProject2: Project;
  let apiKey: ApiKey;
  let apiKey2: ApiKey;

  let testOasisSignature: OasisSignature;

  beforeAll(async () => {
    config = await getConfig();
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
    testProject2 = await createTestProject(testUser2, stage);

    apiKey = await createTestApiKey(
      stage.context.access,
      testProject.project_uuid,
    );

    apiKey2 = await createTestApiKey(
      stage.context.access,
      testProject2.project_uuid,
    );

    //Insert endpoint
    await new Endpoint({}, stage.context.blockchain)
      .populate({
        url: 'https://testnet.sapphire.oasis.io',
        chain: EvmChain.OASIS,
        chainType: ChainType.EVM,
      })
      .insert();

    //Insert wallet
    await new Wallet(
      {
        chain: EvmChain.OASIS,
        chainType: ChainType.EVM,
        address: config.oasis.wallet.address,
        seed: config.oasis.wallet.seed,
        blockParseSize: 50,
        lastParsedBlock: 0,
      },
      stage.context.blockchain,
    ).insert();

    await new Wallet(
      {
        ...config.subsocial.wallet,
        chain: config.subsocial.chain,
        chainType: config.subsocial.chainType,
        nextNonce: 1,
      },
      stage.context.blockchain,
    ).insert();

    //Insert some test oasis signatures
    testOasisSignature = await new OasisSignature(
      {},
      stage.context.authentication,
    )
      .populate({
        apiKey: apiKey.apiKey,
        project_uuid: testProject.project_uuid,
        dataHash:
          '0xf4688cf1bce1a2b84753ac4f7dd8b0f044ba06666bdf0b379203c3551d569736',
        hashedUsername:
          '0xb39ba6e72d147585ea48aeaa042841b781289c1daf1b9edef9bfc8f3eb63f350',
        publicAddress:
          '0x0000000000000000000000008036c0f2e8f93c5e95168be3fd05e2d2743bbe07',
        status: SqlModelStatus.ACTIVE,
      })
      .insert();

    await new OasisSignature({}, stage.context.authentication)
      .populate({
        apiKey: apiKey.apiKey,
        project_uuid: testProject.project_uuid,
        dataHash:
          '0x3a757d127a10a22d803b6516e7d7919b056cc5047b56d3d273eb8150387d6963',
        status: SqlModelStatus.INACTIVE,
      })
      .insert();

    await new OasisSignature({}, stage.context.authentication)
      .populate({
        apiKey: apiKey2.apiKey,
        project_uuid: testProject2.project_uuid,
        dataHash:
          '0xf4688cf1bce1a2b84753ac4f7dd8b0f044ba06666bdf0b379203c3551d569735',
        status: SqlModelStatus.INACTIVE,
      })
      .insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Oasis signature tests', () => {
    test('User should be able to list oasis signatures for the project', async () => {
      const response = await request(stage.http)
        .get(
          `/wallet/oasis-signatures?project_uuid=${testProject.project_uuid}`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(2);
      const tmpSignature = response.body.data.items.find(
        (x) => x.dataHash == testOasisSignature.dataHash,
      );
      expect(tmpSignature).toBeTruthy();
      expect(tmpSignature.hashedUsername).toBe(
        testOasisSignature.hashedUsername,
      );
      expect(tmpSignature.publicAddress).toBe(testOasisSignature.publicAddress);
      expect(tmpSignature.status).toBe(SqlModelStatus.ACTIVE);
    });

    test('User should NOT be able to get ANOTHER USER signatures list', async () => {
      const response = await request(stage.http)
        .get(
          `/wallet/oasis-signatures?project_uuid=${testProject2.project_uuid}`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(403);
    });

    test('User should be able to get count of signatures by api key', async () => {
      const response = await request(stage.http)
        .get(
          `/wallet/oasis-signatures-count-by-api-key?project_uuid=${testProject.project_uuid}`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data[0].oasisSignatures).toBe(2);
      expect(response.body.data[0].name).toBe(apiKey.name);
    });
  });
});
