import {
  Context,
  presenceValidator,
  prop,
  selectAndCountQuery,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  UuidSqlModel,
  getQueryParams,
  BaseProjectQueryFilter,
  JobQueryFilter,
  AWS_KMS,
  env,
  safeJsonParse,
} from '@apillon/lib';
import { arrayParser, stringParser, integerParser } from '@rawmodel/parsers';
import { ComputingErrorCode, DbTables } from '../../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import { v4 as uuid } from 'uuid';
import { AcurastJob } from './acurast-job.model';
import {
  ComputingModelValidationException,
  ComputingNotFoundException,
} from '../../../lib/exceptions';
import { JobEnvVar } from '../acurast-types';

const populatable = [
  PopulateFrom.DB,
  PopulateFrom.SERVICE,
  PopulateFrom.ADMIN,
  PopulateFrom.PROFILE,
];

const serializable = [
  SerializeFor.INSERT_DB,
  SerializeFor.UPDATE_DB,
  SerializeFor.ADMIN,
  SerializeFor.SERVICE,
  SerializeFor.APILLON_API,
  SerializeFor.SELECT_DB,
  SerializeFor.PROFILE,
];

export class CloudFunction extends UuidSqlModel {
  public readonly tableName = DbTables.CLOUD_FUNCTION;

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
    fakeValue: uuid(),
  })
  public function_uuid: string;

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
    serializable,
  })
  public bucket_uuid: string;

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
    fakeValue: 'Cloud Function #1',
  })
  public name: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE],
    serializable: [
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
    ],
  })
  public encrypted_variables: string | null;

  @prop({
    parser: { resolver: stringParser() },
    populatable,
    serializable,
  })
  public description: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable,
    serializable,
  })
  public activeJob_id: number;

  /**
   * Virtual field - list of jobs for this CF
   */
  @prop({
    parser: { resolver: arrayParser() },
    populatable: [],
    serializable: [SerializeFor.PROFILE],
  })
  public jobs: AcurastJob[];

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  public override async populateByUUID(function_uuid: string): Promise<this> {
    const cloudFunction = await super.populateByUUID(
      function_uuid,
      'function_uuid',
    );

    if (!cloudFunction.exists()) {
      throw new ComputingNotFoundException(
        ComputingErrorCode.CLOUD_FUNCTION_NOT_FOUND,
      );
    }

    return cloudFunction;
  }

  public async populateJobs(query: JobQueryFilter) {
    this.jobs = (
      await new AcurastJob(
        { function_uuid: this.function_uuid, project_uuid: this.project_uuid },
        this.getContext(),
      ).getList(new JobQueryFilter(query))
    ).items as AcurastJob[];
  }

  public async getList(
    context: ServiceContext,
    filter: BaseProjectQueryFilter,
  ) {
    this.canAccess(context);

    const fieldMap = {
      id: 'd.id',
    };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'd',
      fieldMap,
      filter.serialize(),
    );
    const sqlQuery = {
      qSelect: `SELECT ${this.generateSelectFields('d', '', SerializeFor.SELECT_DB)}`,
      qFrom: `
        FROM \`${DbTables.CLOUD_FUNCTION}\` d
        WHERE d.project_uuid = @project_uuid
        AND (@search IS null OR d.name LIKE CONCAT('%', @search, '%'))
        AND
            (
                (@status IS NULL AND d.status NOT IN (${SqlModelStatus.DELETED}, ${SqlModelStatus.ARCHIVED}))
                OR
                (d.status = @status)
            )
      `,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    return await selectAndCountQuery(context.mysql, sqlQuery, params, 'd.id');
  }

  public async getEnvironmentVariables(): Promise<JobEnvVar[]> {
    if (!this.encrypted_variables) return [];

    const decryptedVariables = await new AWS_KMS().decrypt(
      this.encrypted_variables,
      env.COMPUTING_KMS_KEY_ID,
    );

    return safeJsonParse(decryptedVariables, []);
  }

  public async setEnvironmentVariables(variables: JobEnvVar[]) {
    if (!variables?.length) {
      this.encrypted_variables = null;
      return;
    }

    this.encrypted_variables = await new AWS_KMS().encrypt(
      JSON.stringify(variables),
      env.COMPUTING_KMS_KEY_ID,
    );

    await this.validateOrThrow(ComputingModelValidationException);

    return await this.update();
  }
}
