import { CreateJobDto } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';

export class AcurastService {
  /**
   * Creates a new acurast job with the given data
   * @param {{ body: CreateJobDto }} params - job creation params
   * @param {ServiceContext} context
   * @returns {Contract}
   */
  static async createJob(
    params: { body: CreateJobDto },
    context: ServiceContext,
  ) {
    console.log(`Creating acurast contract: ${JSON.stringify(params.body)}`);

    return true;
  }
}
