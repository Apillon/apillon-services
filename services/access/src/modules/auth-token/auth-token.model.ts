import { dateParser, stringParser } from '@rawmodel/parsers';
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

  public constructor(data: any, context: Context) {
    super(data, context);
  }
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
   * Returns instruction instance from instructionEnum
   */
  public async populateByUserUuid(user_uuid: string) {
    const data = await this.db().paramExecute(
      `
        SELECT *
        FROM \`${DbTables.AUTH_TOKEN}\` at
        WHERE at.user_uuid == @user_uuid
        LIMIT 1
        `,
      { user_uuid },
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    }
    return this.reset();
  }
}
