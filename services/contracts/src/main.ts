import {
  BlockchainMicroservice,
  ContractEventType,
  ContractMSEventType,
  Lmas,
  Mailing,
} from '@apillon/lib';
import { ContractsController } from './modules/contracts/contractsController';
import { ServiceContext } from '@apillon/service-lib';
import { ContractService } from './modules/contracts/services/contract-service';
import { ContractRepository } from './modules/contracts/repositores/contract-repository';
import { TransactionRepository } from './modules/contracts/repositores/transaction-repository';
import { ContractsSpendService } from './modules/contracts/services/contracts-spend-service';

/**
 * Processing lambda event with appropriate service function based on event name
 * @param event lambda event
 * @param context lambda context
 * @returns service response
 */
export async function processEvent(
  event: ContractMSEventType,
  context: ServiceContext,
): Promise<any> {
  const contractsService = new ContractService(
    context,
    new ContractRepository(context),
    new TransactionRepository(context),
    new BlockchainMicroservice(context),
    new ContractsSpendService(context),
    new Mailing(context),
    new Lmas(),
  );
  const controller = new ContractsController(
    context,
    contractsService,
    new Lmas(),
  );

  switch (event.eventName) {
    case ContractEventType.CONTRACTS_LIST:
      return controller.listContracts(event.body.query);
    case ContractEventType.GET_CONTRACT:
      return controller.getContract(event.body.contract_uuid);
    case ContractEventType.GET_CONTRACT_ABI:
      return controller.getContractAbi(event.body.query);
    case ContractEventType.DEPLOY_CONTRACT:
      return controller.deployContract(event.body);
    case ContractEventType.CALL_DEPLOYED_CONTRACT:
      return controller.callDeployedContract(event.body);
    case ContractEventType.DEPLOYED_CONTRACTS_LIST:
      return controller.listContractDeploys(event.body.query);
    case ContractEventType.GET_DEPLOYED_CONTRACT:
      return controller.getDeployedContract(event.body.contract_uuid);
    case ContractEventType.GET_DEPLOYED_CONTRACT_ABI:
      return controller.getDeployedContractAbi(event.body.query);
    case ContractEventType.PROJECT_DEPLOYED_CONTRACT_DETAILS:
      return controller.getProjectDeployedContractDetails(
        event.body.project_uuid,
      );
    case ContractEventType.ARCHIVE_DEPLOYED_CONTRACT:
      return controller.archiveDeployedContract(event.body.contract_uuid);
    case ContractEventType.ACTIVATE_DEPLOYED_CONTRACT:
      return controller.activateDeployedContract(event.body.contract_uuid);
    case ContractEventType.LIST_DEPLOYED_CONTRACT_TRANSACTIONS:
      return controller.listDeployedContractTransactions(event.body.query);
    default:
      throw new Error('Invalid Contract Event Type');
  }
}
