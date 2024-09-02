import {
  AttachedServiceType,
  BaseProjectQueryFilter,
  CloudFunctionUsageDto,
  CodeException,
  ComputingMicroservice,
  CreateCloudFunctionDto,
  CreateJobDto,
  JobQueryFilter,
  Lmas,
  SetCloudFunctionEnvironmentDto,
  UpdateCloudFunctionDto,
  UpdateJobDto,
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

  async createCloudFunction(
    context: DevConsoleApiContext,
    body: CreateCloudFunctionDto,
  ) {
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

    return (await new ComputingMicroservice(context).createCloudFunction(body))
      .data;
  }

  async listCloudFunctions(
    context: DevConsoleApiContext,
    query: BaseProjectQueryFilter,
  ) {
    return (await new ComputingMicroservice(context).listCloudFunctions(query))
      .data;
  }

  async updateCloudFunction(
    context: DevConsoleApiContext,
    body: UpdateCloudFunctionDto,
  ) {
    return (await new ComputingMicroservice(context).updateCloudFunction(body))
      .data;
  }

  async getCloudFunction(
    context: DevConsoleApiContext,
    query: JobQueryFilter,
  ): Promise<{
    name: string;
    description: string;
    activeJobUuid: string;
    jobs: any[];
  }> {
    return (await new ComputingMicroservice(context).getCloudFunction(query))
      .data;
  }

  async getCloudFunctionUsage(query: CloudFunctionUsageDto) {
    return (await new Lmas().getCloudFunctionUsage(query)).data;
  }

  async createJob(context: DevConsoleApiContext, body: CreateJobDto) {
    return (await new ComputingMicroservice(context).createJob(body)).data;
  }

  async getJob(context: DevConsoleApiContext, job_uuid: string) {
    return (await new ComputingMicroservice(context).getJob(job_uuid)).data;
  }

  async setCloudFunctionEnvironment(
    context: DevConsoleApiContext,
    body: SetCloudFunctionEnvironmentDto,
  ) {
    return (
      await new ComputingMicroservice(context).setCloudFunctionEnvironment(body)
    ).data;
  }

  async executeCloudFunction(
    context: DevConsoleApiContext,
    payload: string,
    function_uuid: string,
  ) {
    return (
      await new ComputingMicroservice(context).executeCloudFunction(
        payload,
        function_uuid,
      )
    ).data;
  }

  async updateJob(context: DevConsoleApiContext, body: UpdateJobDto) {
    return (await new ComputingMicroservice(context).updateJob(body)).data;
  }

  async deleteJob(context: DevConsoleApiContext, job_uuid: string) {
    return (await new ComputingMicroservice(context).deleteJob(job_uuid)).data;
  }
}
