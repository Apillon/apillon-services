import {
  AttachedServiceType,
  CallContractDTO,
  CodeException,
  ContractAbiQueryDTO,
  ContractsMicroservice,
  ContractsQueryFilter,
  ContractTransactionQueryFilter,
  CreateContractDTO,
  DeployedContractsQueryFilter,
} from '@apillon/lib';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ResourceNotFoundErrorCode } from '../../config/types';
import { DevConsoleApiContext } from '../../context';
import { Project } from '../project/models/project.model';
import { ServicesService } from '../services/services.service';
import { Service } from '../services/models/service.model';
import { ServiceQueryFilter } from '../services/dtos/services-query-filter.dto';
import { ServiceDto } from '../services/dtos/service.dto';

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
    // TODO: we read DB twice, once here and once inside ServicesService.createService

    const project = await new Project({}, context).populateByUUIDOrThrow(
      body.project_uuid,
    );

    // Check if contracts service for this project already exists
    const { total } = await new Service({}).getServices(
      context,
      new ServiceQueryFilter(
        {
          project_uuid: project.project_uuid,
          serviceType_id: AttachedServiceType.CONTRACTS,
        },
        context,
      ),
    );
    if (total == 0) {
      // Create contracts service - "Attach"
      const contractsService = new ServiceDto(
        {
          project_uuid: project.project_uuid,
          name: 'Contracts service',
          serviceType_id: AttachedServiceType.CONTRACTS,
        },
        context,
      );
      await this.serviceService.createService(context, contractsService);
    }

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
