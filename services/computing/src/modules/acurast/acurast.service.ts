import {
  CreateJobDto,
  JobQueryFilter,
  Lmas,
  LogType,
  ProductCode,
  ServiceName,
  SetCloudFunctionEnvironmentDto,
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
  SqlModelStatus,
  CloudFunctionCallDto,
  StorageMicroservice,
  CreateBucketDto,
  env,
  DefaultUserRole,
  MySql,
  Mailing,
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
  getAcurastWebsocketUrls,
  setAcurastJobEnvironment,
} from '../../lib/utils/acurast-utils';
import {
  AcurastJobStatus,
  ComputingErrorCode,
  DbTables,
} from '../../config/types';
import { AcurastWebsocketClient } from '../clients/acurast-websocket.client';
import { CloudFunction } from './models/cloud-function.model';
import { JobEnvVar } from './acurast-types';
import axios from 'axios';

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
      status: SqlModelStatus.INACTIVE,
    });

    await cloudFunction.validateOrThrow(ComputingModelValidationException);

    console.info(
      `Creating bucket for cloud function with name ${cloudFunction.name}.`,
    );
    const bucket = (
      await new StorageMicroservice(context).createBucket(
        new CreateBucketDto({
          project_uuid: cloudFunction.project_uuid,
          bucketType: 1, // Storage
          name: `${cloudFunction.name} Bucket`,
        }),
      )
    ).data;
    cloudFunction.bucket_uuid = bucket.bucket_uuid;

    await cloudFunction.insert();
    // Set mailerlite field indicating the user created an acurast cloud function
    new Mailing(context).setMailerliteField('has_cloud_function');

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
    event: { query: JobQueryFilter },
    context: ServiceContext,
  ): Promise<CloudFunction> {
    const cloudFunction = await new CloudFunction({}, context).populateByUUID(
      event.query.function_uuid,
    );

    cloudFunction.canAccess(context);

    await cloudFunction.populateJobs(event.query as JobQueryFilter);
    return cloudFunction.serializeByContext() as CloudFunction;
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

    cloudFunction.canAccess(context);

    await cloudFunction.populate(event.body).update();

    return cloudFunction.serializeByContext() as CloudFunction;
  }

  /**
   * Sets environment variables for an existing cloud function
   * @param {{ body: SetCloudFunctionEnvironmentDto }} event - environment variable pairs
   * @param {ServiceContext} context
   * @returns {Promise<AcurastJob>}
   */
  static async setCloudFunctionEnvironment(
    event: { body: SetCloudFunctionEnvironmentDto },
    context: ServiceContext,
  ): Promise<AcurastJob> {
    const variables = event.body.variables;
    if (!variables?.length || !variables.every((v) => !!v.key && !!v.value)) {
      throw new ComputingValidationException({
        code: ComputingErrorCode.FIELD_INVALID,
        property: 'variables',
      });
    }

    const cloudFunction = await new CloudFunction({}, context).populateByUUID(
      event.body.function_uuid,
    );

    cloudFunction.canModify(context);

    await cloudFunction.setEnvironmentVariables(variables);

    if (cloudFunction.activeJob_id) {
      const job = await new AcurastJob({}, context).populateById(
        cloudFunction.activeJob_id,
      );

      job.verifyStatusAndAccess(
        'setCloudFunctionEnvironment',
        context,
        [AcurastJobStatus.DEPLOYED],
        true,
      );

      await setAcurastJobEnvironment(context, job, variables);
    }

    return cloudFunction.serializeByContext() as AcurastJob;
  }

  /**
   * Gets environment variables for an existing cloud function
   * @param {ServiceContext} context
   * @returns {Promise<AcurastJob>}
   */
  static async getCloudFunctionEnvironment(
    { function_uuid }: { function_uuid: string },
    context: ServiceContext,
  ): Promise<JobEnvVar[]> {
    const cloudFunction = await new CloudFunction({}, context).populateByUUID(
      function_uuid,
    );

    cloudFunction.canModify(context);

    return await cloudFunction.getEnvironmentVariables();
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
    skipAccessCheck = false,
  ): Promise<AcurastJob> {
    writeLog(
      LogType.INFO,
      `Creating acurast job: ${JSON.stringify(event.body)}`,
    );
    event.body = new CreateJobDto(event.body);

    const cloudFunction = await new CloudFunction({}, context).populateByUUID(
      event.body.function_uuid,
    );

    if (!skipAccessCheck) cloudFunction.canAccess(context);

    const job = new AcurastJob(event.body, context).populate({
      job_uuid: uuidV4(),
      function_uuid: cloudFunction.function_uuid,
      project_uuid: cloudFunction.project_uuid,
      // 3 months from now, cannot be indefinite due to protocol limitations
      // After 3 months gets renewed in RenewAcurastJobWorker
      endTime: new Date().setMonth(new Date().getMonth() + 3),
    });

    const { data } = await axios.get(
      `${env.ACURAST_IPFS_LAMBDA_URL}/transform/${job.scriptCid}`,
    );
    job.scriptCid = data.cidv0;

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
        errorMessage: `Error creating acurast job: ${JSON.stringify(err)}`,
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
   * Send a payload to a job and returns response
   * Also tracks the function call in DB and marks it as success or error
   * @param {{ payload: string, function_uuid: string }} event - job message payload
   * @param {ServiceContext} context
   * @returns {Promise<any>}
   */
  static async executeCloudFunction(
    event: { payload: string; function_uuid: string },
    context: ServiceContext,
  ): Promise<any> {
    let job = await runCachedFunction<AcurastJob>(
      `${CacheKeyPrefix.ACURAST_JOB}:${event.function_uuid}`,
      async () => {
        const cloudFunction = await new CloudFunction(
          {},
          context,
        ).populateByUUID(event.function_uuid);

        if (!cloudFunction.activeJob_id) {
          throw new ComputingCodeException({
            status: 500,
            code: ComputingErrorCode.JOB_NOT_DEPLOYED,
            context,
            sourceFunction: 'executeCloudFunction',
          });
        }

        return await new AcurastJob({}, context).populateById(
          cloudFunction.activeJob_id,
        );
      },
      CacheKeyTTL.DEFAULT,
    );
    // In case result is returned from cache
    job = new AcurastJob(job, context);

    // access is not checked for sendMessage
    job.verifyStatusAndAccess('executeCloudFunction', context, [], true);

    return await new AcurastWebsocketClient(await getAcurastWebsocketUrls())
      .send(job.publicKey, event.payload)
      .then(async (result) => {
        new Lmas()
          .saveCloudFunctionCall(
            new CloudFunctionCallDto({
              function_uuid: job.function_uuid,
              success: true,
            }),
          )
          .catch();
        return result;
      })
      .catch(async (err) => {
        new Lmas().saveCloudFunctionCall(
          new CloudFunctionCallDto({
            function_uuid: job.function_uuid,
            success: false,
            error: `${err}`,
          }),
        );
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
   * Set a cloud function's status to archived
   * @param {{ function_uuid: string }} event
   * @param {ServiceContext} context
   * @returns {Promise<CloudFunction>}
   */
  static async archiveCloudFunction(
    event: { function_uuid: string },
    context: ServiceContext,
  ): Promise<CloudFunction> {
    const cloudFunction = await new CloudFunction({}, context).populateByUUID(
      event.function_uuid,
    );

    if (!cloudFunction.exists()) {
      throw new ComputingNotFoundException();
    }
    cloudFunction.canModify(context);

    return await cloudFunction.markArchived();
  }

  /**
   * Set a cloud function's status to active
   * @param {{ function_uuid: string }} event
   * @param {ServiceContext} context
   * @returns {Promise<Contract>}
   */
  static async activateCloudFunction(
    event: { function_uuid: string },
    context: ServiceContext,
  ): Promise<CloudFunction> {
    const cloudFunction = await new CloudFunction({}, context).populateByUUID(
      event.function_uuid,
    );

    if (!cloudFunction.exists()) {
      throw new ComputingNotFoundException();
    }
    cloudFunction.canModify(context);

    return await cloudFunction.markActive();
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
   * @param {{ job_uuid: string }} event
   * @param {ServiceContext} context
   * @returns {Promise<AcurastJob>}
   */
  static async deleteJob(
    { job_uuid }: { job_uuid: string },
    context: ServiceContext,
  ): Promise<AcurastJob> {
    const job = await new AcurastJob({}, context).populateByUUID(job_uuid);

    // job.verifyStatusAndAccess('deleteJob', context, [
    //   AcurastJobStatus.DEPLOYED,
    //   AcurastJobStatus.INACTIVE,
    // ]);
    job.canModify(context);

    const conn = await context.mysql.start();
    try {
      await deleteAcurastJob(context, job, conn);
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
        errorMessage: `Error deleting acurast job: ${JSON.stringify(err)}`,
        details: err,
      }).writeToMonitor({
        logType: LogType.ERROR,
        service: ServiceName.COMPUTING,
        data: { job_uuid, err },
      });
    }

    return job.serializeByContext() as AcurastJob;
  }

  static async verifyRebel(
    { email }: { email: string },
    context: ServiceContext,
  ): Promise<boolean> {
    const devConsoleSql = new MySql({
      host: env.DEV_CONSOLE_API_MYSQL_HOST,
      database: env.DEV_CONSOLE_API_MYSQL_DATABASE,
      password: env.DEV_CONSOLE_API_MYSQL_PASSWORD,
      user: env.DEV_CONSOLE_API_MYSQL_USER,
      port: env.DEV_CONSOLE_API_MYSQL_PORT,
    });
    await devConsoleSql.connect();
    const userProjects = await devConsoleSql.paramExecute(
      `
        SELECT p.project_uuid
        FROM project_user pu
        LEFT JOIN user u ON pu.user_id = u.id
        LEFT JOIN project p ON pu.project_id = p.id
        WHERE u.email = @email
        AND pu.role_id = ${DefaultUserRole.PROJECT_OWNER}
      `,
      { email },
    );
    await devConsoleSql.close();

    const project_uuids = userProjects.map((p) => p.project_uuid);
    if (!project_uuids.length) return false;

    const jobs = await new AcurastJob({}, context).getActiveJobsForProjects(
      project_uuids,
    );
    return jobs.length > 0;
  }
}
