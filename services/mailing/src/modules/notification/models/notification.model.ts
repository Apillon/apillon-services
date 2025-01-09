import {
  AdvancedSQLModel,
  BadRequestErrorCode,
  NotificationAdminQueryFilter,
  NotificationQueryFilter,
  NotificationType,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  enumInclusionValidator,
  getQueryParams,
  prop,
  selectAndCountQuery,
} from '@apillon/lib';
import { dateParser, integerParser, stringParser } from '@rawmodel/parsers';
import { DbTables } from '../../../config/types';
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
        resolver: enumInclusionValidator(NotificationType, true),
        code: BadRequestErrorCode.INVALID_NOTIFICATION_TYPE,
      },
    ],
  })
  public type: NotificationType | null;
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
  public message: string | null;

  /**
   * Id of the user who the notification belongs to. Is null if the notification is public.
   */
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
  })
  public userId: number | null;

  @prop({
    parser: { resolver: dateParser() },
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
    ],
    populatable: [PopulateFrom.DB],
    defaultValue: new Date(),
  })
  public createTime?: Date;

  public async getListForUser(filter: NotificationQueryFilter) {
    const context = this.getContext();
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
                WHERE (@type IS NULL or n.type = @type) AND (n.userId = ${context.user.id} OR n.userId IS NULL)
                AND (n.status = ${SqlModelStatus.ACTIVE})`,
      qFilter: `
                ORDER BY ${filters.orderStr}
                LIMIT ${filters.limit} OFFSET ${filters.offset};`,
    };
    return selectAndCountQuery(context.mysql, sqlQuery, params, 'n.id');
  }

  public async getList(filter: NotificationAdminQueryFilter) {
    const context = this.getContext();
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
                WHERE (@type IS NULL or n.type = @type) AND (n.status = ${SqlModelStatus.ACTIVE})
                AND (@userId IS NULL OR n.userId = @userId)`,
      qFilter: `
                ORDER BY ${filters.orderStr}
                LIMIT ${filters.limit} OFFSET ${filters.offset};`,
    };
    return selectAndCountQuery(context.mysql, sqlQuery, params, 'n.id');
  }
}
