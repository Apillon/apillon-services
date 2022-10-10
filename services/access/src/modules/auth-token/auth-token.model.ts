import { stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  Context,
  PopulateFrom,
  prop,
  SerializeFor,
} from 'at-lib';
import { DbTables } from '../../config/types';

export class AuthToken extends AdvancedSQLModel {
  public readonly tableName = DbTables.AUTH_TOKEN;

  /**
   * Token
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE],
    serializable: [SerializeFor.INSERT_DB],
  })
  public token: string;

  /**
   * AuthUser ID
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE],
    serializable: [SerializeFor.INSERT_DB],
  })
  public user_uuid: string;

  /**
   * Expires in (constant)
   */
  @prop({
    parser: { resolver: stringParser() },
    serializable: [SerializeFor.INSERT_DB],
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE],
  })
  public expiresIn?: string;

  /**
   * Expires in (constant)
   */
  @prop({
    parser: { resolver: stringParser() },
    serializable: [SerializeFor.INSERT_DB],
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE],
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
        WHERE at.user_uuid = @user_uuid AND at.tokenType = @tokenType
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
