import {
  AdvancedSQLModel,
  Context,
  PopulateFrom,
  SerializeFor,
  enumInclusionValidator,
  prop,
  selectAndCountQuery,
} from '@apillon/lib';
import {
  DbTables,
  ServiceStatusErrorCode,
  ServiceStatusType,
} from '../../../config/types';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { DevConsoleApiContext } from '../../../context';

/**
 * Service Status model.
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
    ],
    populatable: [PopulateFrom.ADMIN, PopulateFrom.PROFILE, PopulateFrom.DB],
    validators: [
      {
        resolver: enumInclusionValidator(ServiceStatusType, false),
        code: ServiceStatusErrorCode.INVALID_TYPE,
      },
    ],
  })
  public type: ServiceStatusType;

  public async listServiceStatuses(context: DevConsoleApiContext) {
    const sqlQuery = {
      qSelect: `SELECT ${this.generateSelectFields()}`,
      qFrom: `FROM ${DbTables.SERVICE_STATUS}`,
    };
    const serviceStatuses = await selectAndCountQuery(
      context.mysql,
      sqlQuery,
      {},
      'id',
    );

    return serviceStatuses;
  }
}
