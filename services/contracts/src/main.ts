import {
  BlockchainMicroservice,
  ContractEventType,
  Lmas,
  Mailing,
} from '@apillon/lib';
import { ContractsController } from './modules/contracts/contractsController';
import { ServiceContext } from '@apillon/service-lib';
import { ContractService } from './lib/services/contract-service';
import { ContractRepository } from './lib/repositores/contract-repository';
import { TransactionRepository } from './lib/repositores/transaction-repository';

/**
 * Processing lambda event with appropriate service function based on event name
 * @param event lambda event
 * @param context lambda context
 * @returns service response
 */
export async function processEvent(
  event,
  context: ServiceContext,
): Promise<any> {
  const contractsService = new ContractService(
    context,
    new ContractRepository(context),
    new TransactionRepository(context),
    new BlockchainMicroservice(context),
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
      return controller.listContracts(event);
    case ContractEventType.GET_CONTRACT:
      return controller.getContract(event);
    case ContractEventType.GET_CONTRACT_ABI:
      return controller.getContractAbi(event);
    case ContractEventType.DEPLOY_CONTRACT:
      return controller.deployContract(event);
    case ContractEventType.CALL_DEPLOYED_CONTRACT:
      return controller.callDeployedContract(event);
    case ContractEventType.DEPLOYED_CONTRACTS_LIST:
      return controller.listContractDeploys(event);
    case ContractEventType.GET_DEPLOYED_CONTRACT:
      return controller.getDeployedContract(event);
    case ContractEventType.GET_DEPLOYED_CONTRACT_ABI:
      return controller.getDeployedContractAbi(event);
    case ContractEventType.PROJECT_DEPLOYED_CONTRACT_DETAILS:
      return controller.getProjectDeployedContractDetails(event);
    case ContractEventType.ARCHIVE_DEPLOYED_CONTRACT:
      return controller.archiveDeployedContract(event);
    case ContractEventType.LIST_DEPLOYED_CONTRACT_TRANSACTIONS:
      return controller.listDeployedContractTransactions(event);
    default:
      throw new Error('Invalid Contract Event Type');
  }
}
