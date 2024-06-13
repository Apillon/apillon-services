import {
  Context,
  enumInclusionValidator,
  getQueryParams,
  JobQueryFilter,
  PopulateFrom,
  presenceValidator,
  prop,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
  UuidSqlModel,
} from '@apillon/lib';
import { integerParser, stringParser, dateParser } from '@rawmodel/parsers';
import { ComputingErrorCode, DbTables, JobStatus } from '../../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import {
  ComputingCodeException,
  ComputingNotFoundException,
} from '../../../lib/exceptions';

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
  SerializeFor.APILLON_API,
  SerializeFor.PROFILE,
  SerializeFor.SELECT_DB,
];
const serializableUpdate = [...serializable, SerializeFor.UPDATE_DB];

export class AcurastJob extends UuidSqlModel {
  public readonly tableName = DbTables.ACURAST_JOB;

  @prop({
    parser: { resolver: stringParser() },
    populatable,
    serializable,
    validators: [
      {
        resolver: presenceValidator(),
        code: ComputingErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public job_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable,
    serializable,
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
    serializable: serializableUpdate,
    validators: [
      {
        resolver: presenceValidator(),
        code: ComputingErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
    fakeValue: 'Acurast job#1',
  })
  public name: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable,
    serializable: serializableUpdate,
  })
  public description: string;

  /**
   * IPFS CID of the script's code
   * @example QmUq4iFLKZUpEsHCAqfsBermXHRnPuE5CNcyPv1xaNkyGp
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable,
    serializable,
    validators: [
      {
        resolver: presenceValidator(),
        code: ComputingErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public scriptCid: string;

  /**
   * The timestamp where the job will become available
   */
  @prop({
    parser: { resolver: dateParser() },
    populatable,
    serializable,
  })
  public startTime: Date;

  /**
   * The timestamp where the job will expire
   */
  @prop({
    parser: { resolver: dateParser() },
    populatable,
    serializable,
  })
  public endTime: Date;

  /**
   * The number of processors assigned to the job
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable,
    serializable,
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
    serializable: serializableUpdate,
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
    serializable: serializableUpdate,
    validators: [
      {
        resolver: enumInclusionValidator(JobStatus, true),
        code: ComputingErrorCode.DATA_TYPE_INVALID,
      },
    ],
    defaultValue: JobStatus.CREATED,
  })
  public jobStatus: JobStatus;

  /**
   * The job creation transaction hash
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable,
    serializable,
  })
  public transactionHash: string;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  public override async populateByUUID(job_uuid: string): Promise<this> {
    return super.populateByUUID(job_uuid, 'job_uuid');
  }

  verifyStatusAndAccess(sourceFunction: string, context: ServiceContext) {
    if (!this.exists()) {
      throw new ComputingNotFoundException(ComputingErrorCode.JOB_NOT_FOUND);
    }

    if (![JobStatus.DEPLOYED, JobStatus.MATCHED].includes(this.jobStatus)) {
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

    this.canModify(context);
  }

  public async getList(context: ServiceContext, filter: JobQueryFilter) {
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
    const selectFields = this.generateSelectFields(
      'j',
      '',
      SerializeFor.SELECT_DB,
    );
    const sqlQuery = {
      qSelect: `
        SELECT ${selectFields}
        `,
      qFrom: `
        FROM \`${DbTables.ACURAST_JOB}\` j
        WHERE j.project_uuid = @project_uuid
        AND (@search IS null OR j.name LIKE CONCAT('%', @search, '%'))
        AND (@jobStatus IS null OR j.jobStatus = @jobStatus)
        AND
            (
                (@status IS null AND j.status NOT IN (${SqlModelStatus.DELETED}, ${SqlModelStatus.ARCHIVED}))
                OR
                (j.status = @status)
            )
      `,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    return await selectAndCountQuery(context.mysql, sqlQuery, params, 'j.id');
  }
}
