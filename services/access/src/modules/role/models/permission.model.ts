import {
  AdvancedSQLModel,
  PopulateFrom,
  SerializeFor,
  prop,
} from '@apillon/lib';
import { stringParser } from '@rawmodel/parsers';
import { DbTables } from '../../../config/types';

export class Permission extends AdvancedSQLModel {
  public readonly tableName = DbTables.PERMISSION;

  /**
   * permission name
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
}
