import { ChainType, SmartContractType } from '@apillon/lib';
import {
  ApillonConsoleServerClient,
  createTestProject,
  createTestUser,
  releaseStage,
  Stage,
  TestBlockchain,
} from '@apillon/tests-lib';
import { setupTest } from '../../../../test/helpers/setup';

import { Contract } from '@apillon/contracts/src/modules/contracts/models/contract.model';
import { ContractVersion } from '@apillon/contracts/src/modules/contracts/models/contractVersion.model';
import { erc20Abi, erc20Bytecode } from './contracts/erc20';
import { ContractVersionMethod } from '@apillon/contracts/src/modules/contracts/models/contractVersionMethod.model';

describe('Apillon Console Contracts', () => {
  let blockchain: TestBlockchain;
  let stage: Stage;
  let consoleServerClient: ApillonConsoleServerClient;
  let contract: Contract;
  let contractVersion: ContractVersion;

  beforeAll(async () => {
    stage = await setupTest();

    const testUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    await createTestProject(testUser, stage);
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
    await new ContractVersionMethod({}, stage.context.contracts)
      .populate({
        contract_version_id: contractVersion.id,
        onlyOwner: true,
        name: 'mint',
        description: 'mint ERC-20',
      })
      .insert();
  });

  describe('Undeployed Contracts', () => {
    test('User can get contract', async () => {
      const { body } = await consoleServerClient.get(
        `/${contract.contract_uuid}`,
      );

      expect(body.data.contract_uuid).toBe(contract.contract_uuid);
      expect(body.data.contractVersion.abi).toBeTruthy();
      expect(body.data.contractVersion.methods).toBeTruthy();
    });

    test('User can list contracts', async () => {
      const { body } = await consoleServerClient.get('/');

      expect(body.data.total).toBe(1);
      expect(body.data.items[0].contract_uuid).toBe(contract.contract_uuid);
    });

    test('User can get contract ABi', async () => {
      const { body } = await consoleServerClient.get(
        `/${contract.contract_uuid}/abi`,
      );

      expect(body.data[0]).toBe(
        'constructor(address initialOwner, string name, string symbol)',
      );
    });
  });

  afterAll(async () => {
    if (blockchain) {
      await blockchain.stop();
    }
    await releaseStage(stage);
  });
});
