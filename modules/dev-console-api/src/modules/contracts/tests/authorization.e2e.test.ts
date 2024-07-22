import {
  ChainType,
  EvmChain,
  SmartContractType,
  SqlModelStatus,
} from '@apillon/lib';
import {
  ApillonConsoleServerClient,
  createTestProject,
  createTestUser,
  releaseStage,
  Stage,
} from '@apillon/tests-lib';
import { setupTest } from '../../../../test/helpers/setup';
import { Project } from '@apillon/dev-console-api/src/modules/project/models/project.model';
import { Contract } from '@apillon/contracts/src/modules/contracts/models/contract.model';
import { ContractVersion } from '@apillon/contracts/src/modules/contracts/models/contractVersion.model';
import { erc20Abi, erc20Bytecode } from './contracts/erc20';
import * as request from 'supertest';
import { ContractDeploy } from '@apillon/contracts/dist/modules/contracts/models/contractDeploy.model';
import { ContractStatus } from '@apillon/contracts/dist/config/types';

describe('Apillon API Contracts Authorization Tests', () => {
  const CHAIN_ID = EvmChain.MOONBASE;
  const TEST_WALLET = '0x4C2A866EB59511a6aD78db5cd4970464666b745a';
  let stage: Stage;
  let contract: Contract;
  let deployedContract: ContractDeploy;
  let testProject: Project;
  let anotherClient: ApillonConsoleServerClient;

  beforeAll(async () => {
    stage = await setupTest();

    const testUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    testProject = await createTestProject(testUser, stage);

    // prepare another user
    const anotherUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    anotherClient = new ApillonConsoleServerClient(
      stage.http,
      anotherUser.token,
      '/contracts',
    );

    // ERC-20 CONTRACT INFO
    contract = await new Contract({}, stage.context.contracts)
      .populate({
        contract_uuid: 'contract_uuid',
        contractType: SmartContractType.ERC_20,
        chainType: ChainType.EVM,
        name: 'ERC-20 contract',
        description: 'ERC-20 contract description',
      })
      .insert();
    const contractVersion = await new ContractVersion(
      {},
      stage.context.contracts,
    )
      .populate({
        contract_id: contract.id,
        version: 1,
        abi: erc20Abi,
        bytecode: erc20Bytecode,
        transferOwnershipMethod: 'transferOwnership',
      })
      .insert();
    deployedContract = await new ContractDeploy({}, stage.context.contracts)
      .populate({
        contract_uuid: 'deployed_contract_uuid',
        project_uuid: testProject.project_uuid,
        name: 'name',
        description: 'description',
        chainType: ChainType.EVM,
        chain: CHAIN_ID,
        version_id: contractVersion.id,
        contractStatus: ContractStatus.DEPLOYED,
        status: SqlModelStatus.ACTIVE,
        constructorArguments: [],
      })
      .insert();
  });

  describe('deployed contracts', () => {
    describe('list deployed contracts', () => {
      test('guest can list deployed contracts', async () => {
        const { status, body } = await request(stage.http).get(
          `/contracts/deployed?project_uuid=${deployedContract.project_uuid}`,
        );

        expect(status).toBe(401);
        expect(body.message).toBe('User is not authenticated!');
      });

      test('User cant list deployed contracts from another user', async () => {
        const { status, body } = await anotherClient.get(
          `/deployed?project_uuid=${deployedContract.project_uuid}`,
        );

        expect(status).toBe(403);
        expect(body.message).toBe('Insufficient permissions');
      });
    });

    describe('get deployed contract', () => {
      test('guest can list deployed contracts', async () => {
        const { status, body } = await request(stage.http).get(
          `/contracts/deployed/${deployedContract.contract_uuid}`,
        );

        expect(status).toBe(401);
        expect(body.message).toBe('User is not authenticated!');
      });

      test('User cant get contract from another user', async () => {
        const { status, body } = await anotherClient.get(
          `/deployed/${deployedContract.contract_uuid}`,
        );

        expect(status).toBe(403);
        expect(body.message).toBe('Insufficient permissions');
      });
    });

    describe('get deployed contract abi', () => {
      test('guest can get deployed contract', async () => {
        const { status, body } = await request(stage.http).get(
          `/contracts/deployed/${deployedContract.contract_uuid}/abi`,
        );

        expect(status).toBe(401);
        expect(body.message).toBe('User is not authenticated!');
      });

      test('User cant get contract abi from another user', async () => {
        const { status, body } = await anotherClient.get(
          `/deployed/${deployedContract.contract_uuid}/abi`,
        );

        expect(status).toBe(403);
        expect(body.message).toBe('Insufficient permissions');
      });
    });

    describe('call deployed contract', () => {
      test('guest can call deployed contract', async () => {
        const { status, body } = await request(stage.http).post(
          `/contracts/deployed/${deployedContract.contract_uuid}/call`,
        );

        expect(status).toBe(401);
        expect(body.message).toBe('User is not authenticated!');
      });

      test('User cant call contract from another user', async () => {
        const { status, body } = await anotherClient.post(
          `/deployed/${deployedContract.contract_uuid}/call`,
          {
            methodName: 'transferOwnership',
            methodArguments: [TEST_WALLET],
          },
        );

        expect(status).toBe(403);
        expect(body.message).toBe('Insufficient permissions');
      });
    });

    describe('archive deployed contract', () => {
      test('guest can call deployed contract', async () => {
        const { status, body } = await request(stage.http).delete(
          `/contracts/deployed/${deployedContract.contract_uuid}`,
        );

        expect(status).toBe(401);
        expect(body.message).toBe('User is not authenticated!');
      });

      test('User cant archive contract from another user', async () => {
        const { status, body } = await anotherClient.delete(
          `/deployed/${deployedContract.contract_uuid}`,
        );

        expect(status).toBe(403);
        expect(body.message).toBe('Insufficient permissions');
      });
    });

    describe('list deployed contract transactions', () => {
      test('guest can call deployed contract', async () => {
        const { status, body } = await request(stage.http).get(
          `/contracts/deployed/${deployedContract.contract_uuid}/transactions`,
        );

        expect(status).toBe(401);
        expect(body.message).toBe('User is not authenticated!');
      });

      test('User cant list deployed contract transactions from another user', async () => {
        const { status, body } = await anotherClient.get(
          `/deployed/${deployedContract.contract_uuid}/transactions`,
        );

        expect(status).toBe(403);
        expect(body.message).toBe('Insufficient permissions');
      });
    });
  });

  describe('contracts', () => {
    describe('list contracts', () => {
      test('guest can list contracts', async () => {
        const { status, body } = await request(stage.http).get('/contracts');

        expect(status).toBe(401);
        expect(body.message).toBe('User is not authenticated!');
      });

      test('User cant list contract from another user', async () => {
        const { status, body } = await anotherClient.get('/');

        expect(status).toBe(403);
        expect(body.message).toBe('Insufficient permissions');
      });
    });

    describe('get contract', () => {
      test('guest cant get contract', async () => {
        const { status, body } = await request(stage.http).get(
          `/contracts/${contract.contract_uuid}`,
        );

        expect(status).toBe(401);
        expect(body.message).toBe('User is not authenticated!');
      });

      test('User cant get contract from another user', async () => {
        const { status, body } = await anotherClient.get(
          `/${contract.contract_uuid}`,
        );

        expect(status).toBe(403);
        expect(body.message).toBe('Insufficient permissions');
      });
    });

    describe('deploy contract', () => {
      test('guest cant deploy contract', async () => {
        const { status, body } = await request(stage.http)
          .post(`/contracts/${contract.contract_uuid}/deploy`)
          .send({
            project_uuid: testProject.project_uuid,
            name: 'Contract 1234',
            description: 'descriptipon',
            chain: CHAIN_ID,
            constructorArguments: [TEST_WALLET, 'TokenNAme', 'SYM'],
          });

        expect(status).toBe(401);
        expect(body.message).toBe('User is not authenticated!');
      });

      test('User cant deploy contract from another user', async () => {
        const { status, body } = await anotherClient.post(
          `/${contract.contract_uuid}/deploy`,
          {
            project_uuid: testProject.project_uuid,
            name: 'Contract 1234',
            description: 'descriptipon',
            chain: CHAIN_ID,
            constructorArguments: [TEST_WALLET, 'TokenNAme', 'SYM'],
          },
        );

        expect(status).toBe(403);
        expect(body.message).toBe('Insufficient permissions');
      });
    });
  });

  afterAll(async () => {
    await releaseStage(stage);
  });
});
