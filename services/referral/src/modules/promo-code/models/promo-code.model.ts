import {
  AdvancedSQLModel,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
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

  public async populateByCode(code: string): Promise<this> {
    if (!code) {
      throw new Error('code should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${DbTables.PROMO_CODE}\`
      WHERE UPPER(\`code\`) = UPPER(@code)
      AND validUntil > NOW()
      AND status = ${SqlModelStatus.ACTIVE};
      `,
      { code },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }
}
