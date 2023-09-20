import {
  AdvancedSQLModel,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  presenceValidator,
  prop,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { ConfigErrorCode, DbTables } from '../../../config/types';

export class Product extends AdvancedSQLModel {
  public readonly tableName = DbTables.PRODUCT;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.LOGGER,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ConfigErrorCode.PRODUCT_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public name: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.LOGGER,
    ],
  })
  public description: string;

  /******************************INFO PROPERTIES */

  @prop({
    parser: { resolver: integerParser() },
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.LOGGER,
    ],
  })
  public currentPrice: number;

  public async populateCurrentPrice() {
    const data = await this.getContext().mysql.paramExecute(
      `
          SELECT price
          FROM \`${DbTables.PRODUCT_PRICE}\`
          WHERE product_id = @product_id
          AND status <> ${SqlModelStatus.DELETED}
          AND (validFrom IS NULL OR validFrom >= NOW())
          ORDER BY validFrom DESC
          LIMIT 1;
        `,
      { product_id: this.id },
    );

    if (data?.length) {
      this.currentPrice = data[0].price;
    }
  }
}
