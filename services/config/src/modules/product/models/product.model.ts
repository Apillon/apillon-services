import {
  AdvancedSQLModel,
  PopulateFrom,
  PricelistQueryFilter,
  SerializeFor,
  SqlModelStatus,
  getQueryParams,
  presenceValidator,
  prop,
  selectAndCountQuery,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { ConfigErrorCode, DbTables } from '../../../config/types';
import { ServiceContext } from '@apillon/service-lib';

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
      SerializeFor.PROFILE,
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
      SerializeFor.PROFILE,
      SerializeFor.LOGGER,
    ],
  })
  public description: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.PROFILE,
      SerializeFor.LOGGER,
    ],
  })
  public service: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.PROFILE,
      SerializeFor.LOGGER,
    ],
  })
  public category: string;

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
          AND status = ${SqlModelStatus.ACTIVE}
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

  public async getList(filter: PricelistQueryFilter, context: ServiceContext) {
    const query = new PricelistQueryFilter(filter);
    const fieldMap = {
      id: 'p.id',
    };
    const { params, filters } = getQueryParams(
      query.getDefaultValues(),
      'p',
      fieldMap,
      query.serialize(),
    );

    const sqlQuery = {
      qSelect: `
        SELECT ${this.generateSelectFields('p')}, pr.price as currentPrice
        `,
      qFrom: `
        FROM \`${this.tableName}\` p
        INNER JOIN \`${DbTables.PRODUCT_PRICE}\` pr ON pr.product_id = p.id
        AND (pr.validFrom IS NULL OR pr.validFrom >= NOW())
        AND (@search IS null OR p.name LIKE CONCAT('%', @search, '%'))
        AND (@service IS null OR p.service = @service)
        AND (@category IS null OR p.category = @category)
        AND pr.status = ${SqlModelStatus.ACTIVE}
        AND p.status = ${SqlModelStatus.ACTIVE}
      `,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    return await selectAndCountQuery(context.mysql, sqlQuery, params, 'p.id');
  }
}
