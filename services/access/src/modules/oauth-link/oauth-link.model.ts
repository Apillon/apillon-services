import { integerParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  AdvancedSQLModel,
  Context,
  PoolConnection,
  PopulateFrom,
  prop,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { AmsErrorCode, DbTables, OauthLinkType } from '../../config/types';

export class OauthLink extends AdvancedSQLModel {
  public readonly tableName = DbTables.OAUTH_LINK;

  /**
   * authUser id
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.SERVICE, //
      PopulateFrom.DB,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
    ],
  })
  public authUser_id: number;

  /**
   * oauth service type
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: AmsErrorCode.OAUTH_LINK_TYPE_NOT_PRESENT,
      },
    ],
  })
  public type: number;

  /**
   * external user id
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.SERVICE, //
      PopulateFrom.DB, //
    ],
    serializable: [
      SerializeFor.INSERT_DB, //
      SerializeFor.UPDATE_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: AmsErrorCode.OAUTH_EXTERNAL_USER_ID_NOT_PRESENT,
      },
    ],
  })
  public externalUserId: string;

  /**
   * external username
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.SERVICE, //
      PopulateFrom.DB, //
    ],
    serializable: [
      SerializeFor.INSERT_DB, //
      SerializeFor.UPDATE_DB,
    ],
  })
  public externalUsername: string;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  public isActive(): boolean {
    return (
      this.exists() &&
      !!this.externalUserId &&
      this.status !== SqlModelStatus.DELETED
    );
  }

  public async populateByExternalUserId(
    externalUserId: string,
    type: OauthLinkType,
    conn?: PoolConnection,
  ) {
    const res = await this.db().paramExecute(
      `
      SELECT * FROM ${DbTables.OAUTH_LINK}
      WHERE externalUserId = @externalUserId
      AND type = @type
      
    `,
      { externalUserId, type },
      conn,
    );

    if (res.length) {
      this.populate(res[0], PopulateFrom.DB);
      return this;
    }
    return this.reset();
  }

  public async populateByUserUuidAndType(
    user_uuid: string,
    type: OauthLinkType,
    externalUserId?: string,
    conn?: PoolConnection,
  ) {
    const res = await this.db().paramExecute(
      `
      SELECT 
        ol.* 
      FROM ${DbTables.OAUTH_LINK} ol
      JOIN ${DbTables.AUTH_USER} au
        ON au.id = ol.authUser_id
      WHERE 
        au.user_uuid = @user_uuid
        AND ol.type = @type
        AND (@externalUserId IS NULL OR ol.externalUserId = @externalUserId)
    `,
      { user_uuid, type, externalUserId },
      conn,
    );

    if (res.length) {
      this.populate(res[0], PopulateFrom.DB);
      return this;
    }
    return this.reset();
  }
}
