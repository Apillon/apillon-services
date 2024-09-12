import {
  BaseProjectQueryFilter,
  CloudFunctionUsageDto,
  ComputingMicroservice,
  CreateJobDto,
  JobQueryFilter,
  Lmas,
  SetCloudFunctionEnvironmentDto,
  UpdateCloudFunctionDto,
  UpdateJobDto,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';

@Injectable()
export class AcurastService {
  constructor() {}

  async listCloudFunctions(
    context: ApillonApiContext,
    query: BaseProjectQueryFilter,
  ) {
    return (await new ComputingMicroservice(context).listCloudFunctions(query))
      .data;
  }

  async updateCloudFunction(
    context: ApillonApiContext,
    body: UpdateCloudFunctionDto,
  ) {
    return (await new ComputingMicroservice(context).updateCloudFunction(body))
      .data;
  }

  async getCloudFunction(
    context: ApillonApiContext,
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

  async createJob(context: ApillonApiContext, body: CreateJobDto) {
    return (await new ComputingMicroservice(context).createJob(body)).data;
  }

  async getJob(context: ApillonApiContext, job_uuid: string) {
    return (await new ComputingMicroservice(context).getJob(job_uuid)).data;
  }

  async setCloudFunctionEnvironment(
    context: ApillonApiContext,
    body: SetCloudFunctionEnvironmentDto,
  ) {
    return (
      await new ComputingMicroservice(context).setCloudFunctionEnvironment(body)
    ).data;
  }

  async getCloudFunctionEnvironment(
    context: ApillonApiContext,
    function_uuid: string,
  ) {
    return (
      await new ComputingMicroservice(context).getCloudFunctionEnvironment(
        function_uuid,
      )
    ).data;
  }

  async executeCloudFunction(
    context: ApillonApiContext,
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

  async updateJob(context: ApillonApiContext, body: UpdateJobDto) {
    return (await new ComputingMicroservice(context).updateJob(body)).data;
  }

  async deleteJob(context: ApillonApiContext, job_uuid: string) {
    return (await new ComputingMicroservice(context).deleteJob(job_uuid)).data;
  }
}
