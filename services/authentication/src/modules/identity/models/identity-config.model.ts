import { Context } from '@apillon/lib';
import { BaseSQLModel, PopulateFrom, prop, SerializeFor } from '@apillon/lib';
import { stringParser } from '@rawmodel/parsers';
import { DbTables, IdentityConfigKey } from '../../../config/types';

/**
 * Identity Config table containing key-value pairs
 * @extends {BaseSQLModel}
 */
export class IdentityConfig extends BaseSQLModel {
  public readonly tableName = DbTables.IDENTITY_CONFIG;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
  })
  public key: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
  })
  public value: string;

  exists(): boolean {
    return !!this.key;
  }

  public async populateByKey(key: IdentityConfigKey) {
    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT *
        FROM \`${this.tableName}\`
        WHERE key = @key
        FOR UPDATE;
      `,
      { key },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async modifyKeyValue(key: IdentityConfigKey, value: any) {
    const data = await this.getContext().mysql.paramExecute(
      `
        UPDATE \`${this.tableName}\`
        SET value = @value
        WHERE key = @key
      `,
      { key, value },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async updateNumericKeyValue(key: IdentityConfigKey, amount: number) {
    const data = await this.getContext().mysql.paramExecute(
      `
        UPDATE \`${this.tableName}\`
        SET value = value + @amount
        WHERE key = @key
      `,
      { key, amount },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }
}
