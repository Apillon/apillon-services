import { ServiceContext } from '@apillon/service-lib';
import {
  EvmChain,
  ProductCode,
  ServiceName,
  spendCreditAction,
  SpendCreditDto,
} from '@apillon/lib';
import { v4 as uuidV4 } from 'uuid';
import { DbTables } from '../../../config/types';

export class ContractsSpendService {
  private readonly context: ServiceContext;

  constructor(context: ServiceContext) {
    this.context = context;
  }

  chargeContractDeploy: ChargeCreateContractType = async (
    chain,
    project_uuid,
    contract_uuid,
    action,
  ) => {
    const product_id = {
      [EvmChain.ETHEREUM]: ProductCode.CONTRACT_ETHEREUM_CREATE,
      [EvmChain.SEPOLIA]: ProductCode.CONTRACT_SEPOLIA_CREATE,
      [EvmChain.MOONBASE]: ProductCode.CONTRACT_MOONBASE_CREATE,
      [EvmChain.MOONBEAM]: ProductCode.CONTRACT_MOONBEAM_CREATE,
      [EvmChain.ASTAR]: ProductCode.CONTRACT_ASTAR_CREATE,
    }[chain];
    const spendCredit = new SpendCreditDto(
      {
        project_uuid,
        product_id,
        referenceTable: DbTables.CONTRACT_DEPLOY,
        referenceId: contract_uuid,
        location: 'ContractsService.getCreateContractSpendDto',
        service: ServiceName.CONTRACTS,
      },
      this.context,
    );

    const result = await spendCreditAction(
      this.context,
      spendCredit,
      async () => await action(),
    );

    return { spendUuid: spendCredit.referenceId, result };
  };

  chargeContractCall: ChargeCallContractType = async (
    chain,
    project_uuid,
    action,
  ) => {
    const product_id = {
      [EvmChain.ETHEREUM]: ProductCode.CONTRACT_ETHEREUM_CALL,
      [EvmChain.SEPOLIA]: ProductCode.CONTRACT_SEPOLIA_CALL,
      [EvmChain.MOONBASE]: ProductCode.CONTRACT_MOONBASE_CALL,
      [EvmChain.MOONBEAM]: ProductCode.CONTRACT_MOONBEAM_CALL,
      [EvmChain.ASTAR]: ProductCode.CONTRACT_ASTAR_CALL,
    }[chain];
    const spendCredit = new SpendCreditDto(
      {
        project_uuid,
        product_id,
        referenceTable: DbTables.CONTRACT_DEPLOY,
        referenceId: uuidV4(),
        location: 'ContractsService.getCallContractSpendDto',
        service: ServiceName.CONTRACTS,
      },
      this.context,
    );

    const result = await spendCreditAction(
      this.context,
      spendCredit,
      async () => await action(),
    );
    return { spendUuid: spendCredit.referenceId, result };
  };
}

type ChargeCreateContractType = <T>(
  chain: EvmChain,
  project_uuid: string,
  contract_uuid: string,
  action: () => Promise<T>,
) => Promise<{ result: T; spendUuid: string }>;

type ChargeCallContractType = <T>(
  chain: EvmChain,
  project_uuid: string,
  action: () => Promise<T>,
) => Promise<{ result: T; spendUuid: string }>;
