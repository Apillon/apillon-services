import { env } from '../../../config/env';
import { AppEnvironment, ContractEventType } from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { ContractsQueryFilter } from './dtos/contract-query-filter.dto';
import { DeployedContractsQueryFilter } from './dtos/deployed-contract-query-filter.dto';
import { CreateContractDTO } from './dtos/create-contract.dto';
import { ContractTransactionQueryFilter } from './dtos/transaction-query-filter.dto';
import { CallContractDTO } from './dtos/call-contract.dto';
import { ContractAbiQuery } from './dtos/contract-abi-query.dto';

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

  async listContracts(params: ContractsQueryFilter) {
    const data = {
      eventName: ContractEventType.CONTRACTS_LIST,
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  async getContract(contract_uuid: string) {
    const data = {
      eventName: ContractEventType.GET_CONTRACT,
      contract_uuid,
    };
    return await this.callService(data);
  }

  async getContractAbi(uuid: string, query: ContractAbiQuery) {
    const data = {
      eventName: ContractEventType.GET_CONTRACT_ABI,
      uuid,
      query,
    };
    return await this.callService(data);
  }

  public async deployContract(params: CreateContractDTO) {
    const data = {
      eventName: ContractEventType.DEPLOY_CONTRACT,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async callDeployedContract(params: CallContractDTO) {
    const data = {
      eventName: ContractEventType.CALL_DEPLOYED_CONTRACT,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async getDeployedContract(uuid: string) {
    const data = {
      eventName: ContractEventType.GET_DEPLOYED_CONTRACT,
      uuid,
    };
    return await this.callService(data);
  }

  public async getDeployedContractAbi(uuid: string, query: ContractAbiQuery) {
    const data = {
      eventName: ContractEventType.GET_DEPLOYED_CONTRACT_ABI,
      uuid,
      query,
    };
    return await this.callService(data);
  }

  public async listDeployedContracts(params: DeployedContractsQueryFilter) {
    const data = {
      eventName: ContractEventType.DEPLOYED_CONTRACTS_LIST,
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  public async listDeployedContractTransactions(
    contract_uuid: string,
    params: ContractTransactionQueryFilter,
  ) {
    const data = {
      eventName: ContractEventType.LIST_DEPLOYED_CONTRACT_TRANSACTIONS,
      contract_uuid,
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  public async getProjectDeployedContractsDetails(
    project_uuid: string,
  ): Promise<{
    data: { numOfContracts: number; transactionCount: number };
  }> {
    const data = {
      eventName: ContractEventType.PROJECT_DEPLOYED_CONTRACT_DETAILS,
      project_uuid,
    };
    return await this.callService(data);
  }

  public async archiveDeployedContract(contract_uuid: string) {
    const data = {
      eventName: ContractEventType.ARCHIVE_DEPLOYED_CONTRACT,
      contract_uuid,
    };
    return await this.callService(data);
  }
}
