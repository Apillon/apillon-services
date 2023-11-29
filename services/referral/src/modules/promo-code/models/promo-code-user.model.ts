import {
  AdvancedSQLModel,
  PopulateFrom,
  SerializeFor,
  presenceValidator,
  prop,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { DbTables, ReferralErrorCode } from '../../../config/types';

export class PromoCodeUser extends AdvancedSQLModel {
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

  public async getNumberOfCodeUses(code_id: number): Promise<number> {
    if (!code_id) {
      throw new Error('code_id should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT COUNT(code_id) AS totalUses
      FROM \`${this.tableName}\`
      WHERE \`code_id\` = @code_id;
      `,
      { code_id },
    );

    return data?.length ? data[0].totalUses : 0;
  }

  public async populateByEmail(email: string) {
    if (!email) {
      throw new Error('email should not be null');
    }
    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT * FROM \`${this.tableName}\`
      WHERE user_email = @email
      LIMIT 1;
      `,
      { email },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }
}
