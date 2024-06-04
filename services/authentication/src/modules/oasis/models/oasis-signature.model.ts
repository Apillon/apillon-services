import {
  AdvancedSQLModel,
  Context,
  PopulateFrom,
  SerializeFor,
  presenceValidator,
  prop,
} from '@apillon/lib';
import { stringParser } from '@rawmodel/parsers';
import { v4 as uuidV4 } from 'uuid';
import { AuthenticationErrorCode, DbTables } from '../../../config/types';

export class OasisSignature extends AdvancedSQLModel {
  public readonly tableName = DbTables.OASIS_SIGNATURE;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: AuthenticationErrorCode.OASIS_SIGNATURE_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
    fakeValue: () => uuidV4(),
  })
  public project_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: AuthenticationErrorCode.OASIS_SIGNATURE_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public dataHash: string;
}
