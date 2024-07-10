import {
  AttachedServiceType,
  CallContractDTO,
  CodeException,
  ContractAbiQuery,
  ContractsMicroservice,
  DeployedContractsQueryFilter,
  CreateContractDTO,
  TransactionQueryFilter,
  ContractsQueryFilter,
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
    uuid: string,
    query: ContractAbiQuery,
  ) {
    return (
      await new ContractsMicroservice(context).getContractAbi(uuid, query)
    ).data;
  }

  // DEPLOYED CONTRACTS
  async deployContract(context: DevConsoleApiContext, body: CreateContractDTO) {
    const project: Project = await new Project({}, context).populateByUUID(
      body.project_uuid,
    );
    if (!project.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.PROJECT_DOES_NOT_EXISTS,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    project.canModify(context);

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

    return (
      await new ContractsMicroservice(context).deployContract(
        new CreateContractDTO(body.serialize()),
      )
    ).data;
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
    uuid: string,
    query: ContractAbiQuery,
  ) {
    return (
      await new ContractsMicroservice(context).getDeployedContractAbi(
        uuid,
        query,
      )
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

  async getDeployedContract(context: DevConsoleApiContext, uuid: string) {
    return (await new ContractsMicroservice(context).getDeployedContract(uuid))
      .data;
  }

  async listDeployedContractTransactions(
    context: DevConsoleApiContext,
    contract_uuid: string,
    query: TransactionQueryFilter,
  ) {
    return (
      await new ContractsMicroservice(context).listDeployedContractTransactions(
        contract_uuid,
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
}
