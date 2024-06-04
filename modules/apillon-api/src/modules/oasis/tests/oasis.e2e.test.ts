import {
  ApiKeyRoleBaseDto,
  DefaultApiKeyRole,
  AttachedServiceType,
  generateJwtToken,
  JwtTokenType,
  EvmChain,
  ChainType,
} from '@apillon/lib';
import {
  Stage,
  releaseStage,
  createTestUser,
  createTestApiKey,
  createTestProject,
  createTestProjectService,
  TestBlockchain,
  getConfig,
} from '@apillon/tests-lib';
import { setupTest } from '../../../../test/helpers/setup';
import * as request from 'supertest';
import { Endpoint } from '@apillon/blockchain/src/common/models/endpoint';
import { Wallet } from '@apillon/blockchain/src/modules/wallet/wallet.model';

describe('Oasis tests', () => {
  let config: any;
  let stage: Stage;

  let testUser;
  let apiKey;
  let testProject;
  let testService;

  let token;

  beforeAll(async () => {
    config = await getConfig();
    stage = await setupTest();

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

    testUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    testProject = await createTestProject(testUser, stage);
    testService = await createTestProjectService(
      stage.context.devConsole,
      testProject,
    );

    apiKey = await createTestApiKey(
      stage.context.access,
      testProject.project_uuid,
    );
    await apiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_EXECUTE,
        project_uuid: testProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.WALLET,
      }),
    );
    await apiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_READ,
        project_uuid: testProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.WALLET,
      }),
    );
    await apiKey.assignRole(
      new ApiKeyRoleBaseDto().populate({
        role_id: DefaultApiKeyRole.KEY_WRITE,
        project_uuid: testProject.project_uuid,
        service_uuid: testService.service_uuid,
        serviceType_id: AttachedServiceType.WALLET,
      }),
    );
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Application should be able to generate a session token', async () => {
    const response = await request(stage.http)
      .get(`/oasis/session-token`)
      .set(
        'Authorization',
        `Basic ${Buffer.from(
          `${apiKey.apiKey}:${apiKey.apiKeySecret}`,
        ).toString('base64')}`,
      );
    expect(response.status).toBe(200);
    token = response.body.data.token;
    expect(token).toBeTruthy();
  });

  test('Request without API key should return error', async () => {
    const response = await request(stage.http).get(`/oasis/session-token`);
    expect(response.status).toBe(400);
  });

  test('Application should recieve 422 error if missing required data', async () => {
    const response = await request(stage.http).post(`/oasis/signature`);
    expect(response.status).toBe(422);
  });

  test('Application should recieve 400 error if sending invalid token', async () => {
    const response = await request(stage.http).post(`/oasis/signature`).send({
      token: 'some invalid token',
      data: '0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000022000000000000000000000000000000000000000000000000000000000000000202df26e9fe9bb71ba3424ec9368cfda2de5e6b38f1da3c1b909739c48004ebc0100000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000…000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000008430783034636465613832663030303033316430386565666164316131353765366631373039393265333738323765303166333365666665373239346238396666316230623235343134613666343830343537353766663533613466636363373436386433653464373564656236623964376361376461333634383031383936343665366100000000000000000000000000000000000000000000000000000000',
    });
    expect(response.status).toBe(400);
  });

  test('Application should be able to generate signature for oasis sdk', async () => {
    const response = await request(stage.http).post(`/oasis/signature`).send({
      token,
      data: '0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000022000000000000000000000000000000000000000000000000000000000000000202df26e9fe9bb71ba3424ec9368cfda2de5e6b38f1da3c1b909739c48004ebc0100000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000…000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000008430783034636465613832663030303033316430386565666164316131353765366631373039393265333738323765303166333365666665373239346238396666316230623235343134613666343830343537353766663533613466636363373436386433653464373564656236623964376361376461333634383031383936343665366100000000000000000000000000000000000000000000000000000000',
    });
    expect(response.status).toBe(200);
    expect(response.body.data.signature).toBeTruthy();

    //signature hash should be saved to DB
    const data = await stage.db.authentication.paramExecute(
      `
    SELECT COUNT(*) as numOfSignatures
    FROM \`oasis_signature\`;
    `,
      {},
    );
    expect(data[0].numOfSignatures).toBeGreaterThan(0);
  });
});
