import { integerParser, stringParser } from '@rawmodel/parsers';
import { BaseSQLModel, PopulateFrom, prop, SerializeFor } from '@apillon/lib';
import { DbTables } from '../../../config/types';
import { Role } from './role.model';

export class AuthUserRole extends BaseSQLModel {
  public readonly tableName = DbTables.AUTH_USER_ROLE;

  /**
   * role id
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
  public role_id: number;

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
   * user uuid
   */
  @prop({
    parser: { resolver: stringParser() },
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
  public user_uuid: string;

  /**
   * project uuid
   */
  @prop({
    parser: { resolver: stringParser() },
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
  public project_uuid: string;

  /**
   * role model (virtual)
   */
  @prop({
    parser: { resolver: Role },
    serializable: [
      SerializeFor.ADMIN, //
      SerializeFor.SERVICE,
    ],
  })
  public role: Role;

  public exists(): boolean {
    return !!this.authUser_id && !!this.role_id;
  }
}
