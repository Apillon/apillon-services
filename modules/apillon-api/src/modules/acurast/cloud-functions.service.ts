import {
  BaseProjectQueryFilter,
  ComputingMicroservice,
  CreateCloudFunctionDto,
  CreateJobDto,
  JobQueryFilter,
  SetCloudFunctionEnvironmentDto,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';

@Injectable()
export class CloudFunctionsService {
  async createCloudFunction(
    context: ApillonApiContext,
    body: CreateCloudFunctionDto,
  ) {
    return (await new ComputingMicroservice(context).createCloudFunction(body))
      .data;
  }

  async listCloudFunctions(
    context: ApillonApiContext,
    query: BaseProjectQueryFilter,
  ) {
    return (await new ComputingMicroservice(context).listCloudFunctions(query))
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

  async createJob(context: ApillonApiContext, body: CreateJobDto) {
    return (await new ComputingMicroservice(context).createJob(body)).data;
  }

  async setCloudFunctionEnvironment(
    context: ApillonApiContext,
    body: SetCloudFunctionEnvironmentDto,
  ) {
    return (
      await new ComputingMicroservice(context).setCloudFunctionEnvironment(body)
    ).data;
  }

  async deleteJob(context: ApillonApiContext, job_uuid: string) {
    return (await new ComputingMicroservice(context).deleteJob(job_uuid)).data;
  }

  async verifyRebel(context: ApillonApiContext, email: string) {
    return (await new ComputingMicroservice(context).verifyRebel(email)).data;
  }
}
