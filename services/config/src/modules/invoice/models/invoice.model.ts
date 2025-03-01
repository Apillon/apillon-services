import { dateParser, floatParser, stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  getQueryParams,
  PopulateFrom,
  prop,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
  InvoicesQueryFilter,
  presenceValidator,
  PoolConnection,
  UuidSqlModel,
} from '@apillon/lib';
import { ConfigErrorCode, DbTables } from '../../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import { v4 as uuidV4 } from 'uuid';

export class Invoice extends UuidSqlModel {
  public readonly tableName = DbTables.INVOICE;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ConfigErrorCode.PROJECT_UUID_NOT_PRESENT,
      },
    ],
  })
  public project_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.ADMIN_SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ConfigErrorCode.INVOICE_UUID_NOT_PRESENT,
      },
    ],
    fakeValue: () => uuidV4(),
  })
  public invoice_uuid: string;

  @prop({
    parser: { resolver: floatParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ConfigErrorCode.SUBTOTAL_AMOUNT_NOT_PRESENT,
      },
    ],
  })
  public subtotalAmount: number;

  @prop({
    parser: { resolver: floatParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ConfigErrorCode.TOTAL_AMOUNT_NOT_PRESENT,
      },
    ],
  })
  public totalAmount: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
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
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
    ],
  })
  public referenceId: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
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
    populatable: [PopulateFrom.DB],
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
    populatable: [PopulateFrom.DB],
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
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
    ],
  })
  public stripeId: string;

  @prop({
    parser: { resolver: dateParser() },
    serializable: [SerializeFor.SELECT_DB, SerializeFor.PROFILE],
    populatable: [PopulateFrom.DB],
  })
  public override createTime?: Date;

  public async getList(
    filter: InvoicesQueryFilter,
    context: ServiceContext,
    serializationStrategy = SerializeFor.PROFILE,
  ) {
    const query = new InvoicesQueryFilter(filter);
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
        FROM \`${DbTables.INVOICE}\` i
        WHERE i.project_uuid = @project_uuid
        AND (@reference IS null OR i.referenceTable = @reference)
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

  public async populateByProjectSubscription(
    project_uuid: string,
    conn?: PoolConnection,
  ) {
    if (!project_uuid) {
      throw new Error('project_uuid should not be null');
    }
    const data = await this.db().paramExecute(
      `
        SELECT ${this.generateSelectFields()} FROM \`${DbTables.INVOICE}\`
        WHERE project_uuid = @project_uuid
        AND referenceTable = '${DbTables.SUBSCRIPTION}'
        AND status = ${SqlModelStatus.ACTIVE}
        ORDER BY createTime DESC
        LIMIT 1;
      `,
      { project_uuid },
      conn,
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }
}
