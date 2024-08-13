import {
  BadRequestErrorCode,
  BaseSQLModel,
  ErrorCode,
  NotificationQueryFilter,
  NotificationType,
  PoolConnection,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  enumInclusionValidator,
  getQueryParams,
  presenceValidator,
  prop,
  selectAndCountQuery,
} from '@apillon/lib';

import { dateParser, integerParser } from '@rawmodel/parsers';
import { DbTables } from '../../../config/types';

/**
 * Used to store user's notifications on the application.
 */
export class Notification extends BaseSQLModel {
  public readonly tableName = DbTables.NOTIFICATION;

  public constructor(data: any, context: any) {
    super(data, context);
  }

  /**
   * id
   */
  @prop({
    parser: { resolver: integerParser() },
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.WORKER,
    ],
    populatable: [PopulateFrom.DB],
  })
  public id: number;

  /**
   * status
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ErrorCode.STATUS_NOT_PRESENT,
      },
    ],
    defaultValue: SqlModelStatus.ACTIVE,
    fakeValue() {
      return SqlModelStatus.ACTIVE;
    },
  })
  public status?: number;

  /**
   * Created at property definition.
   */
  @prop({
    parser: { resolver: dateParser() },
    serializable: [SerializeFor.APILLON_API],
    populatable: [PopulateFrom.DB],
  })
  public createTime?: Date;

  /**
   * Updated at property definition.
   */
  @prop({
    parser: { resolver: dateParser() },
    serializable: [SerializeFor.APILLON_API],
    populatable: [PopulateFrom.DB],
  })
  public updateTime?: Date;

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

  /**
   * Tells if the model represents a document stored in the database.
   */
  public exists(): boolean {
    return !!this.id;
  }

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
              WHERE (@type IS NULL or n.type = @type) AND (@isRead IS NULL or n.isRead = @isRead) AND (n.userId is NULL or n.userId = ${context.user.id} ) AND (@status IS NULL OR n.status = @status)`,
      qFilter: `
              ORDER BY ${filters.orderStr}
              LIMIT ${filters.limit} OFFSET ${filters.offset};`,
    };

    return selectAndCountQuery(context.mysql, sqlQuery, params, 'n.id');
  }

  public async populateByIdForUser(id: number): Promise<this> {
    const context = this.getContext();
    this.reset();
    const data = await context.mysql.paramExecute(
      `
      SELECT * FROM notification WHERE id = @id AND (userId is null or userId = @user_id)
    `,
      { id, user_id: context.user.id },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  /**
   * Saves model data in the database as a new document.
   */
  public async insert(
    strategy: SerializeFor = SerializeFor.INSERT_DB,
    conn?: PoolConnection,
    insertIgnore?: boolean,
  ): Promise<this> {
    this.userId = this.getContext().user.id;
    const serializedModel = this.serialize(strategy);
    let isSingleTrans = false;
    if (!conn) {
      isSingleTrans = true;
      conn = await this.getContext().mysql.start();
    }
    try {
      const createQuery = `
        INSERT ${insertIgnore ? 'IGNORE' : ''} INTO \`${this.tableName}\`
        ( ${Object.keys(serializedModel)
          .map((x) => `\`${x}\``)
          .join(', ')} )
        VALUES (
          ${Object.keys(serializedModel)
            .map((key) => `@${key}`)
            .join(', ')}
        )`;

      const response = await this.getContext().mysql.paramExecute(
        createQuery,
        serializedModel,
        conn,
      );
      if (!this.id) {
        this.id = (response as any).insertId;
        if (!this.id) {
          const req = await this.getContext().mysql.paramExecute(
            'SELECT last_insert_id() AS id;',
            null,
            conn,
          );
          this.id = req[0].id;
        }
      }

      if (isSingleTrans) {
        await this.getContext().mysql.commit(conn);
      }
    } catch (err) {
      if (isSingleTrans) {
        await this.getContext().mysql.rollback(conn);
      }
      throw new Error(err);
    }

    return this;
  }

  /**
   * Updates model data in the database.
   */
  public async update(
    strategy: SerializeFor = SerializeFor.UPDATE_DB,
    conn?: PoolConnection,
  ): Promise<this> {
    const serializedModel = this.serialize(strategy);

    // remove non-updatable parameters
    delete serializedModel.id;
    delete serializedModel.createTime;
    delete serializedModel.updateTime;

    let isSingleTrans = false;
    if (!conn) {
      isSingleTrans = true;
      conn = await this.getContext().mysql.start();
    }

    try {
      const createQuery = `
        UPDATE \`${this.tableName}\`
        SET
          ${Object.keys(serializedModel)
            .map((x) => `\`${x}\` = @${x}`)
            .join(',\n')}
        WHERE id = @id
        `;

      // re-set id parameter for where clause.
      serializedModel.id = this.id;

      await this.getContext().mysql.paramExecute(
        createQuery,
        serializedModel,
        conn,
      );

      if (isSingleTrans) {
        await this.getContext().mysql.commit(conn);
      }
    } catch (err) {
      if (isSingleTrans) {
        await this.getContext().mysql.rollback(conn);
      }
      throw new Error(err);
    }

    return this;
  }
}
