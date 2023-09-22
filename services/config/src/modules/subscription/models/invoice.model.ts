import { floatParser, stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  getQueryParams,
  PopulateFrom,
  prop,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
  SubscriptionsQueryFilter,
} from '@apillon/lib';
import { DbTables } from '../../../config/types';
import { ServiceContext } from '@apillon/service-lib';

export class Invoice extends AdvancedSQLModel {
  public readonly tableName = DbTables.INVOICE;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.ADMIN, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
    ],
  })
  public project_uuid: string;

  @prop({
    parser: { resolver: floatParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.ADMIN, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
    ],
  })
  public subtotalAmount: number;

  @prop({
    parser: { resolver: floatParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.ADMIN, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
    ],
  })
  public totalAmount: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.ADMIN, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
    ],
  })
  public referenceTable: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.ADMIN, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
    ],
  })
  public referenceId: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.ADMIN, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
    ],
  })
  public clientEmail: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.ADMIN, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
    ],
  })
  public clientName: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.ADMIN, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
    ],
  })
  public currency: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.ADMIN, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
    ],
  })
  public stripeId: string;

  public async getList(
    filter: SubscriptionsQueryFilter,
    context: ServiceContext,
    serializationStrategy = SerializeFor.PROFILE,
  ) {
    const query = new SubscriptionsQueryFilter(filter);
    const fieldMap = {
      id: 'i.id',
    };
    const { params, filters } = getQueryParams(
      query.getDefaultValues(),
      'i',
      fieldMap,
      query.serialize(),
    );

    const sqlQuery = {
      qSelect: `
        SELECT ${this.generateSelectFields('i', '', serializationStrategy)}
        `,
      qFrom: `
        FROM \`${this.tableName}\` i
        WHERE i.project_uuid = @project_uuid
        AND (@search IS null OR i.clientEmail LIKE CONCAT('%', @search, '%'))
        AND i.status <> ${SqlModelStatus.DELETED}
      `,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    return await selectAndCountQuery(context.mysql, sqlQuery, params, 'i.id');
  }
}
