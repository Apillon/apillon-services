import {
  ComputingMicroservice,
  CreateJobDto,
  JobQueryFilter,
  SetCloudFunctionEnvironmentDto,
  UpdateJobDto,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';

@Injectable()
export class AcurastService {
  constructor() {}

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

  async executeCloudFunction(
    context: ApillonApiContext,
    payload: string,
    job_uuid: string,
  ) {
    return (
      await new ComputingMicroservice(context).executeCloudFunction(
        payload,
        job_uuid,
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
