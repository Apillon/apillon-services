import {
  AdvancedSQLModel,
  Context,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  enumInclusionValidator,
  getQueryParams,
  prop,
  selectAndCountQuery,
} from '@apillon/lib';
import {
  BadRequestErrorCode,
  DbTables,
  ServiceStatusType,
} from '../../../config/types';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { DevConsoleApiContext } from '../../../context';
import { ServiceStatusQueryFilter } from '../dtos/service-status-query-filter.dto';

/**
 * Used to store alerts on the application. Modifiable from the admin panel.
 */
export class ServiceStatus extends AdvancedSQLModel {
  public readonly tableName = DbTables.SERVICE_STATUS;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  @prop({
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.ADMIN,
      SerializeFor.UPDATE_DB,
    ],
    populatable: [PopulateFrom.ADMIN, PopulateFrom.PROFILE, PopulateFrom.DB],
    parser: { resolver: stringParser() },
  })
  public message: string;

  @prop({
    parser: { resolver: stringParser() },
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.ADMIN,
      SerializeFor.UPDATE_DB,
    ],
    populatable: [PopulateFrom.ADMIN, PopulateFrom.PROFILE, PopulateFrom.DB],
  })
  public url?: string;

  @prop({
    parser: { resolver: integerParser() },
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.ADMIN,
      SerializeFor.UPDATE_DB,
    ],
    populatable: [PopulateFrom.ADMIN, PopulateFrom.PROFILE, PopulateFrom.DB],
    validators: [
      {
        resolver: enumInclusionValidator(ServiceStatusType, false),
        code: BadRequestErrorCode.INVALID_SERVICE_STATUS_TYPE,
      },
    ],
  })
  public type: ServiceStatusType;

  public async getList(
    context: DevConsoleApiContext,
    filter: ServiceStatusQueryFilter,
  ) {
    const fieldMap = {
      id: 's.id',
    };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      's',
      fieldMap,
      filter.serialize(),
    );

    const sqlQuery = {
      qSelect: `SELECT ${this.generateSelectFields('s', '', SerializeFor.SELECT_DB)}`,
      qFrom: `FROM \`${DbTables.SERVICE_STATUS}\` s
        WHERE (@type IS NULL OR s.type = @type)
        AND IFNULL(@status, ${SqlModelStatus.ACTIVE}) = status`,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};`,
    };

    return selectAndCountQuery(context.mysql, sqlQuery, params, 's.id');
  }
}
