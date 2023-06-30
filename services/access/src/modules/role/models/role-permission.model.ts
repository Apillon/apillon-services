import { BaseSQLModel, PopulateFrom, SerializeFor, prop } from '@apillon/lib';
import { integerParser } from '@rawmodel/parsers';
import { DbTables } from '../../../config/types';

export class RolePermission extends BaseSQLModel {
  public readonly tableName = DbTables.ROLE_PERMISSION;

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
   * permission id
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
  public permission_id: number;

  public exists(): boolean {
    return !!this.role_id && !!this.permission_id;
  }
}
