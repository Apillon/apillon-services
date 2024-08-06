import {
  AdvancedSQLModel,
  PopulateFrom,
  SerializeFor,
  enumInclusionValidator,
  getQueryParams,
  prop,
  selectAndCountQuery,
} from '@apillon/lib';
import {
  BadRequestErrorCode,
  DbTables,
  NotificationType,
} from '../../../config/types';
import { integerParser } from '@rawmodel/parsers';
import { DevConsoleApiContext } from '../../../context';
import { NotificationQueryFilter } from '../dtos/notification-query-filter.dto';

/**
 * Used to store user's notifications on the application.
 */
export class Notification extends AdvancedSQLModel {
  public readonly tableName = DbTables.NOTIFICATION;

  public constructor(data: any, context: any) {
    super(data, context);
  }

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
    defaultValue: NotificationType.UNKNOWN,
    validators: [
      {
        resolver: enumInclusionValidator(NotificationType, false),
        code: BadRequestErrorCode.INVALID_NOTIFICATION_TYPE,
      },
    ],
  })
  public type: NotificationType;

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
    defaultValue: false,
  })
  public isRead: boolean;

  public async getListForUser(
    context: DevConsoleApiContext,
    filter: NotificationQueryFilter,
  ) {
    const fieldMap = {
      id: 'n.id',
    };

    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'n',
      fieldMap,
      filter.serialize(),
    );

    const sqlQuery = {
      qSelect: `SELECT ${this.generateSelectFields('n', '', SerializeFor.SELECT_DB)}`,
      qFrom: `FROM \`${DbTables.NOTIFICATION}\` n
            WHERE (@type IS NULL or n.type = @type) AND (@isRead IS NULL or n.isRead = @isRead) AND (n.createUser = ${context.user.id}) AND (@status IS NULL OR n.status = @status)`,
      qFilter: `
            ORDER BY ${filters.orderStr}
            LIMIT ${filters.limit} OFFSET ${filters.offset};`,
    };

    return selectAndCountQuery(context.mysql, sqlQuery, params, 'n.id');
  }
}
