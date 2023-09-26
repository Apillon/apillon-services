import {
  booleanParser,
  dateParser,
  integerParser,
  stringParser,
} from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  enumInclusionValidator,
  getQueryParams,
  PoolConnection,
  PopulateFrom,
  presenceValidator,
  prop,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
  SubscriptionPackages,
  SubscriptionsQueryFilter,
} from '@apillon/lib';
import { ConfigErrorCode, DbTables } from '../../../config/types';
import { ServiceContext } from '@apillon/service-lib';

export class Subscription extends AdvancedSQLModel {
  public readonly tableName = DbTables.SUBSCRIPTION;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.ADMIN, //
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ConfigErrorCode.SUBSCRIPTION_ID_NOT_PRESENT,
      },
      {
        resolver: enumInclusionValidator(SubscriptionPackages, true),
        code: ConfigErrorCode.SUBSCRIPTION_ID_NOT_VALID,
      },
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
  })
  public package_id: number;

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
    parser: { resolver: dateParser() },
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
  public expiresOn: Date;

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
  public subscriberEmail: string;

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

  @prop({
    parser: { resolver: integerParser() },
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
    defaultValue: 0,
  })
  public paymentFailures: number;

  @prop({
    parser: { resolver: booleanParser() },
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
    defaultValue: 0,
  })
  public isCanceled: boolean;

  @prop({
    parser: { resolver: dateParser() },
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
  public cancelDate: Date;

  public async getActiveSubscription(
    project_uuid = this.project_uuid,
  ): Promise<this> {
    if (!project_uuid) {
      throw new Error('project_uuid should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${this.tableName}\`
      WHERE project_uuid = @project_uuid
      AND (expiresOn IS NULL OR expiresOn > NOW())
      AND (isCanceled IS NULL OR isCanceled = 0)
      AND status = ${SqlModelStatus.ACTIVE}
      LIMIT 1;
      `,
      { project_uuid },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  /**
   * Check if project has ever had a subscription for a package
   * @param {number} package_id
   * @param {string} [project_uuid=this.project_uuid]
   * @returns {Promise<this>}
   */
  public async getProjectSubscription(
    package_id: number,
    project_uuid = this.project_uuid,
  ): Promise<this> {
    if (!project_uuid) {
      throw new Error('project_uuid should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${this.tableName}\`
      WHERE project_uuid = @project_uuid
      AND package_id = @package_id
      LIMIT 1;
      `,
      { project_uuid, package_id },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async populateByStripeId(stripeId: string, conn?: PoolConnection) {
    const data = await this.db().paramExecute(
      `
        SELECT * FROM \`${this.tableName}\`
        WHERE stripeId = @stripeId
      `,
      { stripeId },
      conn,
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async getList(
    filter: SubscriptionsQueryFilter,
    context: ServiceContext,
    serializationStrategy = SerializeFor.PROFILE,
  ) {
    const query = new SubscriptionsQueryFilter(filter);
    const fieldMap = {
      id: 's.id',
    };
    const { params, filters } = getQueryParams(
      query.getDefaultValues(),
      's',
      fieldMap,
      query.serialize(),
    );

    const sqlQuery = {
      qSelect: `
        SELECT ${this.generateSelectFields('s', '', serializationStrategy)}
        `,
      qFrom: `
        FROM \`${this.tableName}\` s
        WHERE s.project_uuid = @project_uuid
        AND (@search IS null OR s.subscriberEmail LIKE CONCAT('%', @search, '%'))
        AND s.status <> ${SqlModelStatus.DELETED}
      `,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    return await selectAndCountQuery(context.mysql, sqlQuery, params, 's.id');
  }
}
