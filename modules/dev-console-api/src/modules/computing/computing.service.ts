import {
  AssignCidToNft,
  AttachedServiceType,
  CodeException,
  ComputingMicroservice,
  ContractQueryFilter,
  CreateContractDto,
  EncryptContentDto,
  TransferOwnershipDto,
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
export class ComputingService {
  constructor(private readonly serviceService: ServicesService) {}

  async createContract(context: DevConsoleApiContext, body: CreateContractDto) {
    //check project
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

    // Check if computing service for this project already exists
    const { total } = await new Service({}).getServices(
      context,
      new ServiceQueryFilter(
        {
          project_uuid: project.project_uuid,
          serviceType_id: AttachedServiceType.COMPUTING,
        },
        context,
      ),
    );
    if (total == 0) {
      // Create computing service - "Attach"
      const computingService = new ServiceDto(
        {
          project_uuid: project.project_uuid,
          name: 'Computing service',
          serviceType_id: AttachedServiceType.COMPUTING,
        },
        context,
      );
      await this.serviceService.createService(context, computingService);
    }

    return (await new ComputingMicroservice(context).createContract(body)).data;
  }

  async listContracts(
    context: DevConsoleApiContext,
    query: ContractQueryFilter,
  ) {
    return (await new ComputingMicroservice(context).listContracts(query)).data;
  }

  async getContract(context: DevConsoleApiContext, uuid: string) {
    return (await new ComputingMicroservice(context).getContract(uuid)).data;
  }

  async transferContractOwnership(
    context: DevConsoleApiContext,
    body: TransferOwnershipDto,
  ) {
    return (
      await new ComputingMicroservice(context).transferContractOwnership(body)
    ).data;
  }

  async encryptContent(context: DevConsoleApiContext, body: EncryptContentDto) {
    return (await new ComputingMicroservice(context).encryptContent(body)).data;
  }

  async assignCidToNft(context: DevConsoleApiContext, body: AssignCidToNft) {
    return (await new ComputingMicroservice(context).assignCidToNft(body)).data;
  }
}
