import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  PopulateFrom,
  prop,
  SerializeFor,
} from '@apillon/lib';
import { DbTables } from '../../../config/types';

export class Role extends AdvancedSQLModel {
  public readonly tableName = DbTables.ROLE;

  /**
   * role name
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
  })
  public name: string;

  /**
   * role type
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
  })
  public type: string;
}
