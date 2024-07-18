import {
  ChainType,
  EvmChain,
  SmartContractType,
  SqlModelStatus,
  TransactionStatus,
} from '@apillon/lib';
import {
  ApillonConsoleServerClient,
  createTestProject,
  createTestUser,
  releaseStage,
  Stage,
  TestBlockchain,
} from '@apillon/tests-lib';
import { setupTest } from '../../../../test/helpers/setup';
import { Project } from '../../project/models/project.model';

import { Contract } from '@apillon/contracts/src/modules/contracts/models/contract.model';
import { ContractVersion } from '@apillon/contracts/src/modules/contracts/models/contractVersion.model';
import { erc20Abi, erc20Bytecode } from './contracts/erc20';
import { ContractDeploy } from '@apillon/contracts/src/modules/contracts/models/contractDeploy.model';
import { Transaction as BlockchainTx } from '@apillon/blockchain/src/common/models/transaction';
import { Transaction as ContractsTx } from '@apillon/contracts/src/modules/contracts/models/transaction.model';
import {
  ContractsErrorCode,
  ContractStatus,
  TransactionType,
} from '@apillon/contracts/src/config/types';
import { ContractVersionMethod } from '@apillon/contracts/src/modules/contracts/models/contractVersionMethod.model';

describe('Apillon Console EVM Contracts', () => {
  const CHAIN_ID = EvmChain.MOONBASE;
  const TEST_WALLET = '0x4C2A866EB59511a6aD78db5cd4970464666b745a';
  let blockchain: TestBlockchain;
  let stage: Stage;
  let consoleServerClient: ApillonConsoleServerClient;
  let contract: Contract;
  let contractDeploy: ContractDeploy;
  let contractVersion: ContractVersion;
  let testProject: Project;

  beforeAll(async () => {
    stage = await setupTest();
    blockchain = TestBlockchain.fromStage(stage, CHAIN_ID);
    await blockchain.start();

    const testUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    testProject = await createTestProject(testUser, stage);
    consoleServerClient = new ApillonConsoleServerClient(
      stage.http,
      testUser.token,
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
    contractVersion = await new ContractVersion({}, stage.context.contracts)
      .populate({
        contract_id: contract.id,
        version: 1,
        abi: erc20Abi,
        bytecode: erc20Bytecode,
        transferOwnershipMethod: 'transferOwnership',
      })
      .insert();
  });

  describe('ERC-20 on Moonbase', () => {
    test('User can deploy contract', async () => {
      const { status, body } = await consoleServerClient.post(
        `/${contract.contract_uuid}/deploy`,
        {
          project_uuid: testProject.project_uuid,
          name: 'Contract 1234',
          description: 'descriptipon',
          chain: CHAIN_ID,
          constructorArguments: [
            blockchain.getWalletAddress(0),
            'TokenNAme',
            'SYM',
          ],
        },
      );

      expect(status).toBe(201);
      expect(body.data.contractAddress).toBeTruthy();
      const blockchainTx = await new BlockchainTx(
        {},
        stage.context.blockchain,
      ).getTransactionByChainAndHash(CHAIN_ID, body.data.transactionHash);
      expect(blockchainTx.transactionStatus).toBe(TransactionStatus.CONFIRMED);
      const contractTx = await new ContractsTx(
        {},
        stage.context.contracts,
      ).getTransactionByChainAndHash(CHAIN_ID, body.data.transactionHash);
      expect(contractTx.transactionStatus).toBe(TransactionStatus.PENDING);
      contractDeploy = await new ContractDeploy(
        {},
        stage.context.contracts,
      ).populateByUUID(body.data.contract_uuid);
      expect(contractDeploy.exists()).toBeTruthy();
    });

    test('User can list deployed contracts', async () => {
      const { status, body } = await consoleServerClient.get(
        `/deployed?project_uuid=${contractDeploy.project_uuid}`,
      );

      expect(status).toBe(200);
      expect(body.data.total).toBe(1);
      expect(body.data.items[0].contract_uuid).toBe(
        contractDeploy.contract_uuid,
      );
    });

    test('User can get deployed contract', async () => {
      const { status, body } = await consoleServerClient.get(
        `/deployed/${contractDeploy.contract_uuid}`,
      );

      expect(status).toBe(200);
      expect(body.data.contract_uuid).toBe(contractDeploy.contract_uuid);
    });

    test('User can get deployed contract ABi', async () => {
      const { status, body } = await consoleServerClient.get(
        `/deployed/${contractDeploy.contract_uuid}/abi`,
      );

      expect(status).toBe(200);
      expect(body.data[0]).toBe(
        'constructor(address initialOwner, string name, string symbol)',
      );
    });

    test('User cant call contract if it was not deployed yet', async () => {
      const { status, body } = await consoleServerClient.post(
        `/deployed/${contractDeploy.contract_uuid}/call`,
        {
          methodName: 'mint',
          methodArguments: [TEST_WALLET, 1_000_000_000],
        },
      );

      expect(status).toBe(500);
      expect(body.code).toBe(ContractsErrorCode.CONTRACT_NOT_DEPLOYED);
      expect(body.message).toBe(
        ContractsErrorCode[ContractsErrorCode.CONTRACT_NOT_DEPLOYED],
      );

      // update DB for next tests
      contractDeploy.markAsDeployed();
      await contractDeploy.update();
    });

    test('User cant call non-whitelisted method on contract', async () => {
      const { status, body } = await consoleServerClient.post(
        `/deployed/${contractDeploy.contract_uuid}/call`,
        {
          methodName: 'mint',
          methodArguments: [TEST_WALLET, 1_000_000_000],
        },
      );

      expect(status).toBe(422);
      expect(body.errors[0].code).toBe('ABI_ERROR');
      expect(body.errors[0].property).toBe('method');
      expect(body.errors[0].message).toBe('Not allowed to call method mint');
    });

    test('User cant call method that is not marked with onlyOwner=false', async () => {
      await new ContractVersionMethod({}, stage.context.contracts)
        .populate({
          contract_version_id: contractVersion.id,
          onlyOwner: false,
          name: 'burn',
          description: 'mint ERC-20',
        })
        .insert();
      const { status, body } = await consoleServerClient.post(
        `/deployed/${contractDeploy.contract_uuid}/call`,
        {
          methodName: 'burn',
          methodArguments: [1],
        },
      );

      expect(status).toBe(422);
      expect(body.errors[0].code).toBe('ABI_ERROR');
      expect(body.errors[0].property).toBe('method');
      expect(body.errors[0].message).toBe('Not allowed to call method burn');
    });

    test('User can call contract', async () => {
      await new ContractVersionMethod({}, stage.context.contracts)
        .populate({
          contract_version_id: contractVersion.id,
          onlyOwner: true,
          name: 'mint',
          description: 'mint ERC-20',
        })
        .insert();
      const { status, body } = await consoleServerClient.post(
        `/deployed/${contractDeploy.contract_uuid}/call`,
        {
          methodName: 'mint',
          methodArguments: [TEST_WALLET, 1_000_000_000],
        },
      );

      expect(status).toBe(201);
      expect(body.data.transactionStatus).toBe(TransactionStatus.CONFIRMED);
      expect(body.data.transactionHash).toBeTruthy();
      const blockchainTx = await new BlockchainTx(
        {},
        stage.context.blockchain,
      ).getTransactionByChainAndHash(CHAIN_ID, body.data.transactionHash);
      expect(blockchainTx.transactionStatus).toBe(TransactionStatus.CONFIRMED);
      const contractTx = await new ContractsTx(
        {},
        stage.context.contracts,
      ).getTransactionByChainAndHash(CHAIN_ID, body.data.transactionHash);
      expect(contractTx.transactionStatus).toBe(TransactionStatus.PENDING);
    });

    test('User can transfer contract ownership', async () => {
      await new ContractVersionMethod({}, stage.context.contracts)
        .populate({
          contract_version_id: contractVersion.id,
          onlyOwner: true,
          name: 'transferOwnership',
          description: 'transferOwnership of ERC-20 contract',
        })
        .insert();

      const { status, body } = await consoleServerClient.post(
        `/deployed/${contractDeploy.contract_uuid}/call`,
        {
          methodName: 'transferOwnership',
          methodArguments: [TEST_WALLET],
        },
      );

      expect(status).toBe(201);
      expect(body.data.transactionStatus).toBe(TransactionStatus.CONFIRMED);
      expect(body.data.transactionHash).toBeTruthy();
      const blockchainTx = await new BlockchainTx(
        {},
        stage.context.blockchain,
      ).getTransactionByChainAndHash(CHAIN_ID, body.data.transactionHash);
      expect(blockchainTx.transactionStatus).toBe(TransactionStatus.CONFIRMED);
      const contractTx = await new ContractsTx(
        {},
        stage.context.contracts,
      ).getTransactionByChainAndHash(CHAIN_ID, body.data.transactionHash);
      expect(contractTx.transactionStatus).toBe(TransactionStatus.PENDING);
      expect(contractTx.transactionType).toBe(
        TransactionType.TRANSFER_CONTRACT_OWNERSHIP,
      );
    });

    test('User cant transfer contract ownership that is pending transfer', async () => {
      contractDeploy.contractStatus = ContractStatus.TRANSFERRING;
      await contractDeploy.update();

      const { status, body } = await consoleServerClient.post(
        `/deployed/${contractDeploy.contract_uuid}/call`,
        {
          methodName: 'transferOwnership',
          methodArguments: [TEST_WALLET],
        },
      );

      expect(status).toBe(500);
      expect(body.code).toBe(ContractsErrorCode.CONTRACT_OWNER_ERROR);
      expect(body.message).toBe(
        ContractsErrorCode[ContractsErrorCode.CONTRACT_OWNER_ERROR],
      );
    });

    test('User cant transfer contract ownership that was already transferred', async () => {
      contractDeploy.markAsTransferred();
      await contractDeploy.update();

      const { status, body } = await consoleServerClient.post(
        `/deployed/${contractDeploy.contract_uuid}/call`,
        {
          methodName: 'transferOwnership',
          methodArguments: [TEST_WALLET],
        },
      );

      expect(status).toBe(500);
      expect(body.code).toBe(ContractsErrorCode.CONTRACT_OWNER_ERROR);
      expect(body.message).toBe(
        ContractsErrorCode[ContractsErrorCode.CONTRACT_OWNER_ERROR],
      );
    });

    test('User can list deployed contract transactions', async () => {
      const { status, body } = await consoleServerClient.get(
        `/deployed/${contractDeploy.contract_uuid}/transactions`,
      );

      expect(status).toBe(200);
      expect(body.data.items.length).toBeTruthy();
      expect(body.data.total).toBe(3);
      expect(body.data.items[0].transactionType).toBe(
        TransactionType.DEPLOY_CONTRACT,
      );
      expect(body.data.items[1].transactionType).toBe(
        TransactionType.CALL_CONTRACT,
      );
      expect(body.data.items[2].transactionType).toBe(
        TransactionType.TRANSFER_CONTRACT_OWNERSHIP,
      );
    });

    test('User can archive deployed contract', async () => {
      const { status, body } = await consoleServerClient.delete(
        `/deployed/${contractDeploy.contract_uuid}`,
      );

      expect(status).toBe(200);
      expect(body.data.contract_uuid).toBe(contractDeploy.contract_uuid);
      expect(body.data.status).toBe(SqlModelStatus.ARCHIVED);
    });
  });

  afterAll(async () => {
    if (blockchain) {
      await blockchain.stop();
    }
    await releaseStage(stage);
  });
});
