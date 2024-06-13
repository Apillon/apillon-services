import {
  AttachedServiceType,
  CodeException,
  ComputingMicroservice,
  CreateJobDto,
  SetJobEnvironmentDto,
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
export class AcurastService {
  constructor(private readonly serviceService: ServicesService) {}

  async createJob(context: DevConsoleApiContext, body: CreateJobDto) {
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

    // Check if Acurast service for this project already exists
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
      // Create Computing service - "Attach"
      const AcurastService = new ServiceDto(
        {
          project_uuid: project.project_uuid,
          name: 'Acurast service',
          serviceType_id: AttachedServiceType.COMPUTING,
        },
        context,
      );
      await this.serviceService.createService(context, AcurastService);
    }

    return (await new ComputingMicroservice(context).createJob(body)).data;
  }

  async setJobEnvironment(
    context: DevConsoleApiContext,
    body: SetJobEnvironmentDto,
  ) {
    return (await new ComputingMicroservice(context).setJobEnvironment(body))
      .data;
  }
}
