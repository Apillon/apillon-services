import {
  ComputingMicroservice,
  CreateJobDto,
  JobQueryFilter,
  SetJobEnvironmentDto,
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

  async setJobEnvironment(
    context: ApillonApiContext,
    body: SetJobEnvironmentDto,
  ) {
    return (await new ComputingMicroservice(context).setJobEnvironment(body))
      .data;
  }

  async sendJobMessage(
    context: ApillonApiContext,
    payload: string,
    job_uuid: string,
  ) {
    return (
      await new ComputingMicroservice(context).sendJobMessage(payload, job_uuid)
    ).data;
  }

  async updateJob(context: ApillonApiContext, body: UpdateJobDto) {
    return (await new ComputingMicroservice(context).updateJob(body)).data;
  }

  async deleteJob(context: ApillonApiContext, job_uuid: string) {
    return (await new ComputingMicroservice(context).deleteJob(job_uuid)).data;
  }
}
