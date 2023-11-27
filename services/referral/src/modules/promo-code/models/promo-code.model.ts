import {
  AdvancedSQLModel,
  PopulateFrom,
  SerializeFor,
  presenceValidator,
  prop,
} from '@apillon/lib';
import { dateParser, integerParser, stringParser } from '@rawmodel/parsers';
import { DbTables, ReferralErrorCode } from '../../../config/types';

export class PromoCode extends AdvancedSQLModel {
  public readonly tableName = DbTables.PROMO_CODE;

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
        code: ReferralErrorCode.PROMO_CODE_NOT_PRESENT,
      },
    ],
  })
  public code: string;

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
        code: ReferralErrorCode.PROMO_CODE_CREDIT_AMOUNT_NOT_PRESENT,
      },
    ],
  })
  public creditAmount: number;

  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
    ],
  })
  public validUntil: Date;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
    ],
  })
  public maxUses: number;
}
