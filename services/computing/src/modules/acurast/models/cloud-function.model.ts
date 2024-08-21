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
} from '@apillon/lib';
import { stringParser } from '@rawmodel/parsers';
import { ComputingErrorCode, DbTables } from '../../../config/types';
import { ServiceContext } from '@apillon/service-lib';

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
  SerializeFor.SELECT_DB,
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
    validators: [
      {
        resolver: presenceValidator(),
        code: ComputingErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
    fakeValue: 'Function #1',
  })
  public name: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable,
    serializable,
  })
  public description: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable,
    serializable,
  })
  public activeJob_uuid: string;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  public override async populateByUUID(function_uuid: string): Promise<this> {
    return super.populateByUUID(function_uuid, 'function_uuid');
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
                (@status IS null AND d.status NOT IN (${SqlModelStatus.DELETED}, ${SqlModelStatus.ARCHIVED}))
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
}
