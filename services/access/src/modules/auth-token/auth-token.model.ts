import { stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  Context,
  PopulateFrom,
  presenceValidator,
  prop,
  SerializeFor,
} from 'at-lib';
import { AmsErrorCode, DbTables } from '../../config/types';

export class AuthToken extends AdvancedSQLModel {
  public readonly tableName = DbTables.AUTH_TOKEN;

  /**
   * Token
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
  public token: string;

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
    validators: [
      {
        resolver: presenceValidator(),
        code: AmsErrorCode.USER_AUTH_TOKEN_EXPIRES_IN_NOT_PRESENT,
      },
    ],
  })
  public expiresIn?: string;

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
  public async populateByUserAndType(user_uuid: string, tokenType: string) {
    const data = await this.db().paramExecute(
      `
        SELECT *
        FROM \`${DbTables.AUTH_TOKEN}\` at
        WHERE at.user_uuid = @user_uuid 
          AND at.tokenType = @tokenType
          AND at.status = 5
        LIMIT 1
        `,
      { user_uuid, tokenType },
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    }
    return this.reset();
  }
}
