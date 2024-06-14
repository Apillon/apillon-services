import {
  CreateJobDto,
  JobQueryFilter,
  Lmas,
  LogType,
  ProductCode,
  ServiceName,
  SetJobEnvironmentDto,
  SpendCreditDto,
  spendCreditAction,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { AcurastJob } from './models/acurast-job.model';
import { v4 as uuidV4 } from 'uuid';
import {
  ComputingCodeException,
  ComputingNotFoundException,
  ComputingValidationException,
} from '../../lib/exceptions';
import {
  deleteAcurastJob,
  deployAcurastJob,
  setAcurastJobEnvironment,
} from '../../lib/utils/acurast-utils';
import { ComputingErrorCode, DbTables } from '../../config/types';

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
    console.log(`Creating acurast job: ${JSON.stringify(event.body)}`);
    event.body = new CreateJobDto(event.body);

    const job = new AcurastJob(event.body, context).populate({
      job_uuid: uuidV4(),
    });

    const conn = await context.mysql.start();
    try {
      await job.validateOrThrow(ComputingValidationException);

      const referenceId = uuidV4();
      await spendCreditAction(
        context,
        new SpendCreditDto(
          {
            project_uuid: job.project_uuid,
            product_id: ProductCode.COMPUTING_JOB_CREATE,
            referenceTable: DbTables.TRANSACTION,
            referenceId,
            location: 'AcurastService.createJob',
            service: ServiceName.COMPUTING,
          },
          context,
        ),
        async () =>
          await deployAcurastJob(
            context,
            await job.insert(),
            referenceId,
            conn,
          ),
      );
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
        errorMessage: `Error creating acurast job: ${err}`,
        details: err,
      }).writeToMonitor({
        logType: LogType.ERROR,
        service: ServiceName.COMPUTING,
        data: { dto: event.body.serialize(), err },
        sendAdminAlert: true,
      });
    }

    return job.serializeByContext() as AcurastJob;
  }

  /**
   * Returns a list of all jobs for a project
   * @param {{ query: JobQueryFilter }} event
   * @param {ServiceContext} context
   * @returns {AcurastJob[]}
   */
  static async listJobs(
    event: { query: JobQueryFilter },
    context: ServiceContext,
  ) {
    return await new AcurastJob(
      { project_uuid: event.query.project_uuid },
      context,
    ).getList(context, new JobQueryFilter(event.query));
  }

  /**
   * Gets a job by UUID
   * @param {{ job_uuid: string }} event
   * @param {ServiceContext} context
   * @returns {Promise<AcurastJob>}
   */
  static async getJobByUuid(
    { job_uuid }: { job_uuid: string },
    context: ServiceContext,
  ): Promise<AcurastJob> {
    const job = await new AcurastJob({}, context).populateByUUID(job_uuid);

    if (!job.exists()) {
      throw new ComputingNotFoundException(ComputingErrorCode.JOB_NOT_FOUND);
    }
    job.canAccess(context);

    return job.serializeByContext() as AcurastJob;
  }

  /**
   * Sets environment variables for an existing job
   * @param {{ body: SetJobEnvironmentDto }} event - environment variable pairs
   * @param {ServiceContext} context
   * @returns {Promise<AcurastJob>}
   */
  static async setJobEnvironment(
    event: { body: SetJobEnvironmentDto },
    context: ServiceContext,
  ): Promise<AcurastJob> {
    const job = await new AcurastJob({}, context).populateByUUID(
      event.body.job_uuid,
    );

    job.verifyStatusAndAccess('setJobEnvironment', context);

    const referenceId = uuidV4();
    await spendCreditAction(
      context,
      new SpendCreditDto(
        {
          project_uuid: job.project_uuid,
          product_id: ProductCode.COMPUTING_JOB_SET_ENVIRONMENT,
          referenceTable: DbTables.TRANSACTION,
          referenceId,
          location: 'AcurastService.setJobEnvironment',
          service: ServiceName.COMPUTING,
        },
        context,
      ),
      async () =>
        await setAcurastJobEnvironment(
          context,
          job,
          referenceId,
          event.body.variables,
        ),
    );

    return job.serializeByContext() as AcurastJob;
  }

  /**
   * Unregister an acurast job and mark as deleted
   * @param {{ job_uuid: string }} event - environment variable pairs
   * @param {ServiceContext} context
   * @returns {Promise<AcurastJob>}
   */
  static async deleteJob(
    { job_uuid }: { job_uuid: string },
    context: ServiceContext,
  ): Promise<AcurastJob> {
    const job = await new AcurastJob({}, context).populateByUUID(job_uuid);

    job.verifyStatusAndAccess('deleteJob', context);

    const conn = await context.mysql.start();
    try {
      await job.validateOrThrow(ComputingValidationException);

      const referenceId = uuidV4();
      await spendCreditAction(
        context,
        new SpendCreditDto(
          {
            project_uuid: job.project_uuid,
            product_id: ProductCode.COMPUTING_JOB_DELETE,
            referenceTable: DbTables.TRANSACTION,
            referenceId,
            location: 'AcurastService.deleteJob',
            service: ServiceName.COMPUTING,
          },
          context,
        ),
        async () => await deleteAcurastJob(context, job, referenceId, conn),
      );

      await context.mysql.commit(conn);

      await new Lmas().writeLog({
        context,
        project_uuid: job.project_uuid,
        logType: LogType.INFO,
        message: `Acurast job ${job.job_uuid} deleted`,
        location: 'AcurastService/deleteJob',
        service: ServiceName.COMPUTING,
        data: { job_uuid: job.job_uuid },
      });
    } catch (err) {
      await context.mysql.rollback(conn);

      throw await new ComputingCodeException({
        status: 500,
        code: ComputingErrorCode.DELETE_JOB_ERROR,
        context,
        sourceFunction: 'AcruastService/deleteJob',
        errorMessage: `Error deleting acurast job: ${err}`,
        details: err,
      }).writeToMonitor({
        logType: LogType.ERROR,
        service: ServiceName.COMPUTING,
        data: { job_uuid, err },
      });
    }

    return job.serializeByContext() as AcurastJob;
  }
}
