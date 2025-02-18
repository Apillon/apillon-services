import {
  AttachedServiceType,
  BaseProjectQueryFilter,
  CloudFunctionUsageDto,
  ComputingMicroservice,
  CreateCloudFunctionDto,
  CreateJobDto,
  JobQueryFilter,
  Lmas,
  SetCloudFunctionEnvironmentDto,
  UpdateCloudFunctionDto,
  UpdateJobDto,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { Project } from '../project/models/project.model';
import { ServicesService } from '../services/services.service';

@Injectable()
export class AcurastService {
  constructor(private readonly serviceService: ServicesService) {}

  async createCloudFunction(
    context: DevConsoleApiContext,
    body: CreateCloudFunctionDto,
  ) {
    await this.serviceService.createServiceIfNotExists(
      context,
      body.project_uuid,
      AttachedServiceType.COMPUTING,
    );

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

  async getCloudFunctionEnvironment(
    context: DevConsoleApiContext,
    function_uuid: string,
  ) {
    return (
      await new ComputingMicroservice(context).getCloudFunctionEnvironment(
        function_uuid,
      )
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

  async archiveCloudFunction(
    context: DevConsoleApiContext,
    function_uuid: string,
  ) {
    return (
      await new ComputingMicroservice(context).archiveCloudFunction(
        function_uuid,
      )
    ).data;
  }

  async activateCloudFunction(
    context: DevConsoleApiContext,
    function_uuid: string,
  ) {
    return (
      await new ComputingMicroservice(context).activateCloudFunction(
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
