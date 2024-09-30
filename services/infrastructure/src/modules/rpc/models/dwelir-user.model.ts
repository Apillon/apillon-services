import {
  AdvancedSQLModel,
  PopulateFrom,
  SerializeFor,
  prop,
} from '@apillon/lib';
import { DbTables } from '../../../config/types';
import { stringParser } from '@rawmodel/parsers';

export class DwellirUser extends AdvancedSQLModel {
  public readonly tableName = DbTables.DWELLIR_USER;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
    ],
  })
  public user_uuid: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
  })
  public dwellir_id: string;
}
