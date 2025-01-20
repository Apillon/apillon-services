import { env } from '../../../config/env';
import { AppEnvironment, ContractEventType } from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { DeployedContractsQueryFilter } from './dtos/deployed-contract-query-filter.dto';
import { CreateContractDTO } from './dtos/create-contract.dto';
import { ContractTransactionQueryFilter } from './dtos/transaction-query-filter.dto';
import { CallContractDTO } from './dtos/call-contract.dto';
import { ContractAbiQueryDTO } from './dtos/contract-abi-query.dto';
import { ContractsQueryFilter } from './dtos/contract-query-filter.dto';
import { ContractMSEventType } from './eventTypes';

export class ContractsMicroservice extends BaseService {
  lambdaFunctionName =
    env.APP_ENV === AppEnvironment.TEST
      ? env.CONTRACTS_FUNCTION_NAME_TEST
      : env.CONTRACTS_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.CONTRACTS_SOCKET_PORT_TEST
      : env.CONTRACTS_SOCKET_PORT;
  serviceName = 'CONTRACTS';

  constructor(context: Context) {
    super(context);
    this.isDefaultAsync = false;
  }

  async emitEvent(event: ContractMSEventType) {
    return await this.callService(event);
  }

  async listContracts(query: ContractsQueryFilter) {
    return await this.emitEvent({
      eventName: ContractEventType.CONTRACTS_LIST,
      body: {
        query,
      },
    });
  }

  async getContract(contract_uuid: string) {
    return await this.emitEvent({
      eventName: ContractEventType.GET_CONTRACT,
      body: {
        contract_uuid,
      },
    });
  }

  async getContractAbi(query: ContractAbiQueryDTO) {
    return await this.emitEvent({
      eventName: ContractEventType.GET_CONTRACT_ABI,
      body: {
        query,
      },
    });
  }

  public async deployContract(body: CreateContractDTO) {
    return await this.emitEvent({
      eventName: ContractEventType.DEPLOY_CONTRACT,
      body,
    });
  }

  public async callDeployedContract(body: CallContractDTO) {
    return await this.emitEvent({
      eventName: ContractEventType.CALL_DEPLOYED_CONTRACT,
      body,
    });
  }

  public async getDeployedContract(contract_uuid: string) {
    return await this.emitEvent({
      eventName: ContractEventType.GET_DEPLOYED_CONTRACT,
      body: { contract_uuid },
    });
  }

  public async getDeployedContractAbi(query: ContractAbiQueryDTO) {
    return await this.emitEvent({
      eventName: ContractEventType.GET_DEPLOYED_CONTRACT_ABI,
      body: { query },
    });
  }

  public async listDeployedContracts(query: DeployedContractsQueryFilter) {
    return await this.emitEvent({
      eventName: ContractEventType.DEPLOYED_CONTRACTS_LIST,
      body: { query },
    });
  }

  public async listDeployedContractTransactions(
    query: ContractTransactionQueryFilter,
  ) {
    return await this.emitEvent({
      eventName: ContractEventType.LIST_DEPLOYED_CONTRACT_TRANSACTIONS,
      body: {
        query,
      },
    });
  }

  public async getProjectDeployedContractsDetails(
    project_uuid: string,
  ): Promise<{
    data: { numOfContracts: number; transactionCount: number };
  }> {
    return await this.emitEvent({
      eventName: ContractEventType.PROJECT_DEPLOYED_CONTRACT_DETAILS,
      body: { project_uuid },
    });
  }

  public async archiveDeployedContract(contract_uuid: string) {
    return await this.emitEvent({
      eventName: ContractEventType.ARCHIVE_DEPLOYED_CONTRACT,
      body: { contract_uuid },
    });
  }

  public async activateDeployedContract(contract_uuid: string) {
    return await this.emitEvent({
      eventName: ContractEventType.ACTIVATE_DEPLOYED_CONTRACT,
      body: { contract_uuid },
    });
  }
}
