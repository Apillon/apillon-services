import {
  AdvancedSQLModel,
  PopulateFrom,
  SerializeFor,
  presenceValidator,
  prop,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { DbTables, ReferralErrorCode } from '../../../config/types';

export class PromoCode extends AdvancedSQLModel {
  public readonly tableName = DbTables.PROMO_CODE_USER;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ReferralErrorCode.PROMO_CODE_NOT_PRESENT,
      },
    ],
  })
  public code_id: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ReferralErrorCode.USER_UUID_NOT_PRESENT,
      },
    ],
  })
  public user_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ReferralErrorCode.USER_EMAIL_NOT_PRESENT,
      },
    ],
  })
  public user_email: string;
}
