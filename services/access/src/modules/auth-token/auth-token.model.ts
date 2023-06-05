import { stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  Context,
  PoolConnection,
  PopulateFrom,
  presenceValidator,
  prop,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { AmsErrorCode, DbTables } from '../../config/types';

export class AuthToken extends AdvancedSQLModel {
  public readonly tableName = DbTables.AUTH_TOKEN;

  /**
   * Token hash
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE],
    serializable: [SerializeFor.INSERT_DB],
    validators: [
      {
        resolver: presenceValidator(),
        code: AmsErrorCode.USER_AUTH_TOKEN_NOT_PRESENT,
      },
    ],
  })
  public tokenHash: string;

  /**
   * AuthUser ID
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE],
    serializable: [SerializeFor.INSERT_DB],
    validators: [
      {
        resolver: presenceValidator(),
        code: AmsErrorCode.USER_UUID_NOT_PRESENT,
      },
    ],
  })
  public user_uuid: string;

  /**
   * Expires in (constant)
   */
  @prop({
    parser: { resolver: stringParser() },
    serializable: [SerializeFor.INSERT_DB],
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE],
    // TODO: Check what happens if token == null OR token == undefined
    // Uncomment block if needed
    // validators: [
    //   {
    //     resolver: presenceValidator(),
    //     code: AmsErrorCode.USER_AUTH_TOKEN_EXPIRES_IN_NOT_PRESENT,
    //   },
    // ],
  })
  public expiresIn: string;

  /**
   * Expires in (constant)
   */
  @prop({
    parser: { resolver: stringParser() },
    serializable: [SerializeFor.INSERT_DB],
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE],
    validators: [
      {
        resolver: presenceValidator(),
        code: AmsErrorCode.USER_AUTH_TOKEN_TYPE_NOT_PRESENT,
      },
    ],
  })
  public tokenType: string;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  /**
   * Returns auth token by uuid
   */
  public async populateByUserAndType(
    user_uuid: string,
    tokenType: string,
    conn?: PoolConnection,
  ) {
    const data = await this.db().paramExecute(
      `
        SELECT *
        FROM \`${DbTables.AUTH_TOKEN}\` at
        WHERE at.user_uuid = @user_uuid 
          AND at.tokenType = @tokenType
          AND at.status = ${SqlModelStatus.ACTIVE}
        LIMIT 1
        `,
      { user_uuid, tokenType },
      conn,
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    }
    return this.reset();
  }

  /**
   * Returns auth token by uuid
   */
  public async populateByTokenHash(tokenHash: string, conn?: PoolConnection) {
    const data = await this.db().paramExecute(
      `
        SELECT *
        FROM \`${DbTables.AUTH_TOKEN}\` at
        WHERE at.tokenHash = @tokenHash
        LIMIT 1
        `,
      { tokenHash },
      conn,
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    }
    return this.reset();
  }
}
