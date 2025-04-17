import {
  AttachedServiceType,
  CallContractDTO,
  ContractAbiQueryDTO,
  ContractsMicroservice,
  ContractsQueryFilter,
  ContractTransactionQueryFilter,
  CreateContractDTO,
  DeployedContractsQueryFilter,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { ServicesService } from '../services/services.service';

@Injectable()
export class ContractsService {
  constructor(private readonly serviceService: ServicesService) {}

  async listContracts(
    context: DevConsoleApiContext,
    query: ContractsQueryFilter,
  ) {
    return (await new ContractsMicroservice(context).listContracts(query)).data;
  }

  async getContract(context: DevConsoleApiContext, contract_uuid: string) {
    return (await new ContractsMicroservice(context).getContract(contract_uuid))
      .data;
  }

  async getContractAbi(
    context: DevConsoleApiContext,
    query: ContractAbiQueryDTO,
  ) {
    return (await new ContractsMicroservice(context).getContractAbi(query))
      .data;
  }

  // DEPLOYED CONTRACTS
  async deployContract(context: DevConsoleApiContext, body: CreateContractDTO) {
    await this.serviceService.createServiceIfNotExists(
      context,
      body.project_uuid,
      AttachedServiceType.CONTRACTS,
    );

    return (await new ContractsMicroservice(context).deployContract(body)).data;
  }

  async callDeployedContract(
    context: DevConsoleApiContext,
    body: CallContractDTO,
  ) {
    return (await new ContractsMicroservice(context).callDeployedContract(body))
      .data;
  }

  async getDeployedContractAbi(
    context: DevConsoleApiContext,
    query: ContractAbiQueryDTO,
  ) {
    return (
      await new ContractsMicroservice(context).getDeployedContractAbi(query)
    ).data;
  }

  async listDeployedContracts(
    context: DevConsoleApiContext,
    query: DeployedContractsQueryFilter,
  ) {
    return (
      await new ContractsMicroservice(context).listDeployedContracts(query)
    ).data;
  }

  async getDeployedContract(
    context: DevConsoleApiContext,
    contract_uuid: string,
  ) {
    return (
      await new ContractsMicroservice(context).getDeployedContract(
        contract_uuid,
      )
    ).data;
  }

  async listDeployedContractTransactions(
    context: DevConsoleApiContext,
    query: ContractTransactionQueryFilter,
  ) {
    return (
      await new ContractsMicroservice(context).listDeployedContractTransactions(
        query,
      )
    ).data;
  }

  async archiveDeployedContract(
    context: DevConsoleApiContext,
    contract_uuid: string,
  ) {
    return (
      await new ContractsMicroservice(context).archiveDeployedContract(
        contract_uuid,
      )
    ).data;
  }

  async activateDeployedContract(
    context: DevConsoleApiContext,
    contract_uuid: string,
  ) {
    return (
      await new ContractsMicroservice(context).activateDeployedContract(
        contract_uuid,
      )
    ).data;
  }
}
