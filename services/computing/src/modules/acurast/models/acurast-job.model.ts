import {
  Context,
  enumInclusionValidator,
  getQueryParams,
  JobQueryFilter,
  PoolConnection,
  PopulateFrom,
  presenceValidator,
  prop,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
  UuidSqlModel,
} from '@apillon/lib';
import { integerParser, stringParser, dateParser } from '@rawmodel/parsers';
import {
  ComputingErrorCode,
  DbTables,
  AcurastJobStatus,
} from '../../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import {
  ComputingCodeException,
  ComputingNotFoundException,
} from '../../../lib/exceptions';
import { v4 as uuid } from 'uuid';

const populatable = [
  PopulateFrom.DB,
  PopulateFrom.SERVICE,
  PopulateFrom.ADMIN,
  PopulateFrom.PROFILE,
];
const serializable = [
  SerializeFor.INSERT_DB,
  SerializeFor.ADMIN,
  SerializeFor.SERVICE,
  SerializeFor.SELECT_DB,
];

const serializableProfile = [
  ...serializable,
  SerializeFor.PROFILE,
  SerializeFor.APILLON_API,
];
const serializableUpdate = [...serializable, SerializeFor.UPDATE_DB];
const serializableUpdateProfile = [
  ...serializableProfile,
  SerializeFor.UPDATE_DB,
];

export class AcurastJob extends UuidSqlModel {
  public readonly tableName = DbTables.ACURAST_JOB;

  /**
   * Override field to show in API
   */
  @prop({
    parser: { resolver: integerParser() },
    serializable: [
      SerializeFor.SERVICE,
      SerializeFor.WORKER,
      SerializeFor.LOGGER,
      SerializeFor.SELECT_DB,
      SerializeFor.APILLON_API,
    ],
    populatable: [PopulateFrom.DB],
  })
  public id: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable,
    serializable: serializableProfile,
    validators: [
      {
        resolver: presenceValidator(),
        code: ComputingErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
    fakeValue: uuid(),
  })
  public job_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable,
    serializable: serializableProfile,
    validators: [
      {
        resolver: presenceValidator(),
        code: ComputingErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public project_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable,
    serializable: serializableProfile,
    validators: [
      {
        resolver: presenceValidator(),
        code: ComputingErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public function_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable,
    serializable: serializableUpdateProfile,
    validators: [
      {
        resolver: presenceValidator(),
        code: ComputingErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
    fakeValue: 'Acurast job#1',
  })
  public name: string;

  /**
   * IPFS CID of the script's code
   * @example QmUq4iFLKZUpEsHCAqfsBermXHRnPuE5CNcyPv1xaNkyGp
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable,
    serializable: serializableProfile,
    validators: [
      {
        resolver: presenceValidator(),
        code: ComputingErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
    fakeValue: 'QmUq4iFLKZUpEsHCAqfsBermXHRnPuE5CNcyPv1xaNkyGp',
  })
  public scriptCid: string;

  /**
   * The timestamp when the job will expire
   */
  @prop({
    parser: { resolver: dateParser() },
    populatable,
    serializable,
    validators: [
      {
        resolver: presenceValidator(),
        code: ComputingErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
    fakeValue: Date.now() + 60 * 60_000,
  })
  public endTime: Date;

  /**
   * The number of processors assigned to the job
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable,
    serializable: serializableProfile,
    validators: [
      {
        resolver: presenceValidator(),
        code: ComputingErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
    defaultValue: 1,
    fakeValue: 1,
  })
  public slots: number;

  /**
   * The on-chain job ID
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable,
    serializable: serializableUpdateProfile,
  })
  public jobId: number;

  /**
   * The account public key of the job's processor
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable,
    serializable: serializableUpdate,
  })
  public account: string;

  /**
   * The public key of the job
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable,
    serializable: serializableUpdate,
  })
  public publicKey: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable,
    serializable: serializableUpdateProfile,
    validators: [
      {
        resolver: enumInclusionValidator(AcurastJobStatus, true),
        code: ComputingErrorCode.DATA_TYPE_INVALID,
      },
    ],
    defaultValue: AcurastJobStatus.DEPLOYING,
    fakeValue: AcurastJobStatus.DEPLOYING,
  })
  public jobStatus: AcurastJobStatus;

  /**
   * The job creation transaction hash
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable,
    serializable: serializableUpdate,
  })
  public transactionHash: string;

  /**
   * The job's deployer wallet address
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable,
    serializable: serializableUpdate,
  })
  public deployerAddress: string;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  public override async populateByUUID(job_uuid: string): Promise<this> {
    return super.populateByUUID(job_uuid, 'job_uuid');
  }

  verifyStatusAndAccess(
    sourceFunction: string,
    context: ServiceContext,
    additionalStatuses?: AcurastJobStatus[],
    skipAccessCheck = false,
  ) {
    if (!this.exists()) {
      throw new ComputingNotFoundException(ComputingErrorCode.JOB_NOT_FOUND);
    }

    const requiredStatuses = [AcurastJobStatus.MATCHED];
    if (additionalStatuses?.length)
      requiredStatuses.push(...additionalStatuses);

    if (!requiredStatuses.includes(this.jobStatus)) {
      throw new ComputingCodeException({
        status: 500,
        code: ComputingErrorCode.JOB_NOT_DEPLOYED,
        context,
        sourceFunction,
      });
    }

    if (!this.jobId) {
      throw new ComputingCodeException({
        status: 500,
        code: ComputingErrorCode.JOB_ID_IS_MISSING,
        context,
        sourceFunction,
      });
    }

    if (!skipAccessCheck) {
      this.canModify(context);
    }
  }

  public async getList(filter: JobQueryFilter) {
    if (!filter.function_uuid) {
      throw new Error(
        `function_uuid should not be null: ${filter.function_uuid}`,
      );
    }

    const context = this.getContext();
    this.canAccess(context);

    const fieldMap = {
      id: 'j.id',
    };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'j',
      fieldMap,
      filter.serialize(),
    );

    const sqlQuery = {
      qSelect: `SELECT ${this.generateSelectFields('j', '', SerializeFor.SELECT_DB)}`,
      qFrom: `
        FROM \`${DbTables.ACURAST_JOB}\` j
        WHERE j.function_uuid = @function_uuid
        AND (@search IS NULL OR j.name LIKE CONCAT('%', @search, '%'))
        AND
            (
              (@jobStatus IS NULL AND j.jobStatus <> ${AcurastJobStatus.DELETED})
              OR
              (j.jobStatus = @jobStatus)
            )
        AND
            (
              (@status IS NULL AND j.status NOT IN (${SqlModelStatus.DELETED}, ${SqlModelStatus.ARCHIVED}))
              OR
              (j.status = @status)
            )
      `,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    const jobResults = await selectAndCountQuery(
      context.mysql,
      sqlQuery,
      params,
      'j.id',
    );

    return {
      ...jobResults,
      items: jobResults.items.map((job) =>
        new AcurastJob(job, context).serializeByContext(),
      ),
    };
  }

  /**
   * Get deployed jobs that need to be matched and assigned to a processor (pending)
   * Only queries jobs where the current date is between job.startTime and job.endTime
   * @returns {Promise<AcurastJob[]>}
   */
  public async getPendingJobs(): Promise<AcurastJob[]> {
    const context = this.getContext();
    const jobs = await context.mysql.paramExecute(
      `
      SELECT *
      FROM ${DbTables.ACURAST_JOB}
      WHERE endTime > NOW()
      AND jobStatus = ${AcurastJobStatus.DEPLOYED}
      AND jobId IS NOT NULL
      AND status = ${SqlModelStatus.ACTIVE}
      `,
    );

    return jobs.map((j) =>
      new AcurastJob({}, context).populate(j, PopulateFrom.DB),
    );
  }

  /**
   * When a new job is deployed, clear the older jobs of a function_uuid
   * Sets the status of all jobs to inactive
   */
  public async clearPreviousJobs(conn?: PoolConnection): Promise<void> {
    const context = this.getContext();
    await context.mysql.paramExecute(
      `
      UPDATE ${DbTables.ACURAST_JOB}
      SET jobStatus = ${AcurastJobStatus.INACTIVE}
      WHERE function_uuid = @function_uuid
      AND status = ${SqlModelStatus.ACTIVE}
      `,
      { function_uuid: this.function_uuid },
      conn,
    );
  }

  /**
   * Acurast jobs have a limited lifetime of 3 months due to protocol limitations
   * On the day of expiration, need to deploy a new job with the same parameters
   */
  public async getExpiringToday(conn?: PoolConnection): Promise<AcurastJob[]> {
    const context = this.getContext();
    return await context.mysql.paramExecute(
      `
      SELECT *
      FROM ${DbTables.ACURAST_JOB}
      WHERE DATE(endTime) = CURDATE()
      AND jobStatus = ${AcurastJobStatus.MATCHED}
      AND status = ${SqlModelStatus.ACTIVE}
      `,
      {},
      conn,
    );
  }

  public async getActiveJobsForProjects(
    project_uuids: string[],
  ): Promise<AcurastJob[]> {
    const context = this.getContext();
    return await context.mysql.paramExecute(
      `
      SELECT ${this.generateSelectFields('j', '', SerializeFor.SELECT_DB)}
      FROM ${DbTables.ACURAST_JOB} j
      WHERE j.project_uuid IN (${project_uuids.map((uuid) => `"${uuid}"`).join(',')})
      AND j.status = ${SqlModelStatus.ACTIVE}
      AND j.jobStatus = ${AcurastJobStatus.MATCHED}
      `,
    );
  }
}
