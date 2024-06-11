import { CreateJobDto } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { AcurastJob } from './models/acurast-job.model';
import { v4 as uuidV4 } from 'uuid';
import { ComputingValidationException } from '../../lib/exceptions';

export class AcurastService {
  /**
   * Creates a new acurast job with the given data
   * @param {{ body: CreateJobDto }} event - job creation params
   * @param {ServiceContext} context
   * @returns {Promise<AcurastJob>}
   */
  static async createJob(
    event: { body: CreateJobDto },
    context: ServiceContext,
  ): Promise<AcurastJob> {
    console.log(`Creating acurast contract: ${JSON.stringify(event.body)}`);

    const job = new AcurastJob(event.body, context).populate({
      job_uuid: uuidV4(),
    });

    await job.validateOrThrow(ComputingValidationException);

    return await job.insert();
  }
}
