import { CreateJobDto, Lmas, LogType, ServiceName } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { AcurastJob } from './models/acurast-job.model';
import { v4 as uuidV4 } from 'uuid';
import {
  ComputingCodeException,
  ComputingValidationException,
} from '../../lib/exceptions';
import { deployAcurastJob } from '../../lib/utils/acurast-utils';
import { ComputingErrorCode } from '../../config/types';

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
    event.body = new CreateJobDto(event.body);

    const job = new AcurastJob(event.body, context).populate({
      job_uuid: uuidV4(),
    });

    const conn = await context.mysql.start();
    try {
      await job.validateOrThrow(ComputingValidationException);

      await deployAcurastJob(context, await job.insert(), conn);

      await context.mysql.commit(conn);

      await new Lmas().writeLog({
        context,
        project_uuid: job.project_uuid,
        logType: LogType.INFO,
        message: 'New Acurast job created and submitted for deployment',
        location: 'AcurastService/createJob',
        service: ServiceName.COMPUTING,
        data: { job_uuid: job.job_uuid },
      });
    } catch (err) {
      await context.mysql.rollback(conn);

      throw await new ComputingCodeException({
        status: 500,
        code: ComputingErrorCode.DEPLOY_JOB_ERROR,
        context,
        sourceFunction: 'AcruastService/createJob',
        errorMessage: `Error creating job: ${err}`,
        details: err,
      }).writeToMonitor({
        logType: LogType.ERROR,
        service: ServiceName.COMPUTING,
        data: { dto: event.body.serialize(), err },
      });
    }

    return job.serializeByContext() as AcurastJob;
  }
}
