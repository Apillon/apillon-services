import {
  CreateJobDto,
  JobQueryFilter,
  Lmas,
  LogType,
  ProductCode,
  ServiceName,
  SetJobEnvironmentDto,
  SpendCreditDto,
  UpdateJobDto,
  spendCreditAction,
  writeLog,
  SerializeFor,
  runCachedFunction,
  CacheKeyPrefix,
  CacheKeyTTL,
  BaseProjectQueryFilter,
  CreateCloudFunctionDto,
  UpdateCloudFunctionDto,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { AcurastJob } from './models/acurast-job.model';
import { v4 as uuidV4 } from 'uuid';
import {
  ComputingCodeException,
  ComputingNotFoundException,
  ComputingModelValidationException,
  ComputingValidationException,
} from '../../lib/exceptions';
import {
  deleteAcurastJob,
  deployAcurastJob,
  getAcurastWebsocketUrl,
  setAcurastJobEnvironment,
} from '../../lib/utils/acurast-utils';
import {
  AcurastJobStatus,
  ComputingErrorCode,
  DbTables,
} from '../../config/types';
import { AcurastWebsocketClient } from '../clients/acurast-websocket.client';
import { CloudFunction } from './models/cloud-function.model';

export class AcurastService {
  /**
   * Creates a new cloud function with the given data
   * @param {{ body: CreateCloudFunctionDto }} event - CF creation params
   * @param {ServiceContext} context
   * @returns {Promise<CloudFunction>}
   */
  static async createCloudFunction(
    event: { body: CreateCloudFunctionDto },
    context: ServiceContext,
  ): Promise<CloudFunction> {
    const cloudFunction = new CloudFunction(event.body, context).populate({
      function_uuid: uuidV4(),
    });

    await cloudFunction.validateOrThrow(ComputingModelValidationException);
    await cloudFunction.insert();

    return cloudFunction.serializeByContext() as CloudFunction;
  }

  /**
   * Returns a list of all cloud functions a project
   * @param {{ query: BaseProjectQueryFilter }} event
   * @param {ServiceContext} context
   * @returns {Promise<CloudFunction[]>}
   */
  static async listCloudFunctions(
    event: { query: BaseProjectQueryFilter },
    context: ServiceContext,
  ) {
    return await new CloudFunction(
      { project_uuid: event.query.project_uuid },
      context,
    ).getList(context, new BaseProjectQueryFilter(event.query));
  }

  /**
   * Gets a cloud function by UUID
   * @param {{ function_uuid: string }} event
   * @param {ServiceContext} context
   * @returns {Promise<CloudFunction>}
   */
  static async getCloudFunctionByUuid(
    { function_uuid }: { function_uuid: string },
    context: ServiceContext,
  ): Promise<AcurastJob> {
    const cloudFunction = await new CloudFunction({}, context).populateByUUID(
      function_uuid,
    );

    if (!cloudFunction.exists()) {
      throw new ComputingNotFoundException(
        ComputingErrorCode.CLOUD_FUNCTION_NOT_FOUND,
      );
    }

    cloudFunction.canAccess(context);

    return cloudFunction.serializeByContext() as AcurastJob;
  }

  /**
   * Updates a cloud function by UUID
   * @param {{ body: UpdateCloudFunctionDto }} event - contains cloud function update params
   * @param {ServiceContext} context
   * @returns {Promise<CloudFunction>}
   */
  static async updateCloudFunction(
    event: { body: UpdateCloudFunctionDto },
    context: ServiceContext,
  ): Promise<CloudFunction> {
    const cloudFunction = await new CloudFunction({}, context).populateByUUID(
      event.body.function_uuid,
    );

    if (!cloudFunction.exists()) {
      throw new ComputingNotFoundException(
        ComputingErrorCode.CLOUD_FUNCTION_NOT_FOUND,
      );
    }
    cloudFunction.canAccess(context);

    await cloudFunction.populate(event.body).update();

    return cloudFunction.serializeByContext() as CloudFunction;
  }

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
    writeLog(
      LogType.INFO,
      `Creating acurast job: ${JSON.stringify(event.body)}`,
    );
    event.body = new CreateJobDto(event.body);

    const job = new AcurastJob(event.body, context).populate({
      job_uuid: uuidV4(),
    });

    await job.validateOrThrow(ComputingModelValidationException);

    const conn = await context.mysql.start();
    try {
      await job.insert(SerializeFor.INSERT_DB, conn);
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
        async () => await deployAcurastJob(context, job, referenceId, conn),
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
   * Send a message to a job and return response
   * @param {{ payload: string, job_uuid: string }} event - job message payload
   * @param {ServiceContext} context
   * @returns {Promise<AcurastJob>}
   */
  static async sendJobMessage(
    event: { payload: string; job_uuid: string },
    context: ServiceContext,
  ): Promise<AcurastJob> {
    const publicKey = await runCachedFunction(
      `${CacheKeyPrefix.ACURAST_JOB}:${event.job_uuid}`,
      async () => {
        const job = await new AcurastJob({}, context).populateByUUID(
          event.job_uuid,
        );
        // access is not checked for sendMessage
        job.verifyStatusAndAccess('sendJobMessage', context, undefined, true);
        return job.publicKey;
      },
      CacheKeyTTL.DEFAULT,
    );

    if (!event.payload) {
      throw new ComputingValidationException({
        code: ComputingErrorCode.REQUIRED_DATA_NOT_PRESENT,
        property: 'payload',
      });
    }

    return await new AcurastWebsocketClient(await getAcurastWebsocketUrl())
      .send(publicKey, event.payload)
      .catch(async (err) => {
        throw await new ComputingCodeException({
          status: 500,
          code: ComputingErrorCode.ERROR_SENDING_JOB_PAYLOAD,
          errorMessage: err.message,
        }).writeToMonitor({
          logType: LogType.ERROR,
          service: ServiceName.COMPUTING,
          data: { ...event },
        });
      });
  }

  /**
   * Updates a job by UUID
   * @param {{ body: UpdateJobDto }} event - contains job update params
   * @param {ServiceContext} context
   * @returns {Promise<AcurastJob>}
   */
  static async updateJob(
    event: { body: UpdateJobDto },
    context: ServiceContext,
  ): Promise<AcurastJob> {
    const job = await new AcurastJob({}, context).populateByUUID(
      event.body.job_uuid,
    );

    if (!job.exists()) {
      throw new ComputingNotFoundException(ComputingErrorCode.JOB_NOT_FOUND);
    }
    job.canAccess(context);

    await job.populate(event.body).update();

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

    job.verifyStatusAndAccess('deleteJob', context, AcurastJobStatus.DEPLOYED);

    const conn = await context.mysql.start();
    try {
      await deleteAcurastJob(context, job, conn);

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
