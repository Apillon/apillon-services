import { dateParser, integerParser, stringParser } from '@rawmodel/parsers';
import {
  enumInclusionValidator,
  getQueryParams,
  PoolConnection,
  PopulateFrom,
  presenceValidator,
  ProjectAccessModel,
  prop,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
  SubscriptionPackageId,
  SubscriptionsQueryFilter,
} from '@apillon/lib';
import {
  ConfigErrorCode,
  DbTables,
  QuotaWarningLevel,
} from '../../../config/types';
import { ServiceContext } from '@apillon/service-lib';

export class Subscription extends ProjectAccessModel {
  public readonly tableName = DbTables.SUBSCRIPTION;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    validators: [
      {
        resolver: presenceValidator(),
        code: ConfigErrorCode.SUBSCRIPTION_PACKAGE_ID_NOT_PRESENT,
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
  public package_id: SubscriptionPackageId;

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
    parser: { resolver: dateParser() },
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
        code: ConfigErrorCode.EXPIRATION_DATE_NOT_PRESENT,
      },
    ],
  })
  public expiresOn: Date;

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
    validators: [
      {
        resolver: presenceValidator(),
        code: ConfigErrorCode.CLIENT_EMAIL_NOT_PRESENT,
      },
    ],
  })
  public subscriberEmail: string;

  /**
   * Stipe Subscription Unique ID
   */
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
    validators: [
      {
        resolver: presenceValidator(),
        code: ConfigErrorCode.STRIPE_ID_NOT_VALID,
      },
    ],
  })
  public stripeId: string;

  @prop({
    parser: { resolver: dateParser() },
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
  public cancelDate: Date;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.SERVICE, PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
    ],
  })
  public cancellationReason: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.SERVICE, PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
    ],
  })
  public cancellationComment: string;

  /**
   * Shows which level of warning for exceeding a quota has been sent
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.SERVICE, PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: enumInclusionValidator(QuotaWarningLevel, true),
        code: ConfigErrorCode.INVALID_QUOTA_WARNING_LEVEL,
      },
    ],
  })
  public quotaWarningLevel: QuotaWarningLevel;

  public async getActiveSubscription(
    project_uuid = this.project_uuid,
    conn?: PoolConnection,
  ): Promise<this> {
    if (!project_uuid) {
      throw new Error('project_uuid should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${DbTables.SUBSCRIPTION}\`
      WHERE project_uuid = @project_uuid
      AND (expiresOn IS NULL OR expiresOn > NOW())
      AND package_id <> ${SubscriptionPackageId.RPC_PLAN}
      AND status = ${SqlModelStatus.ACTIVE}
      LIMIT 1;
      `,
      { project_uuid },
      conn,
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async hasActiveRpcPlan(
    project_uuid: string | string[] = this.project_uuid,
  ): Promise<boolean> {
    if (!project_uuid) {
      throw new Error('project_uuid should not be null');
    }

    let project_uuids: string[] = [];
    if (!Array.isArray(project_uuid)) {
      project_uuids = [project_uuid];
    } else {
      project_uuids = project_uuid;
    }

    const data = await this.getContext().mysql.paramExecute(
      `SELECT * FROM \`${DbTables.SUBSCRIPTION}\`
      WHERE project_uuid IN (${project_uuids.map((uuid) => `'${uuid}'`).join(',')})
      AND package_id = ${SubscriptionPackageId.RPC_PLAN}
      AND (expiresOn IS NULL OR expiresOn > NOW())
      AND status = ${SqlModelStatus.ACTIVE}`,
    );

    return data?.length > 0;
  }

  /**
   * Check if project has ever had a subscription for a package
   * @param {number} package_id
   * @param {string} [project_uuid=this.project_uuid]
   * @param conn
   * @returns {Promise<this>}
   */
  public async getProjectSubscription(
    package_id: number,
    project_uuid = this.project_uuid,
    conn?: PoolConnection,
  ): Promise<this> {
    if (!project_uuid) {
      throw new Error('project_uuid should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${DbTables.SUBSCRIPTION}\`
      WHERE project_uuid = @project_uuid
      AND package_id = @package_id
      ORDER BY createTime ASC
      LIMIT 1;
      `,
      { project_uuid, package_id },
      conn,
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async populateByStripeId(stripeId: string, conn?: PoolConnection) {
    if (!stripeId) {
      throw new Error('stripeId should not be null');
    }
    // Only active status is not considered here because this should also find subscriptions with status inactive
    // In case somebody wants to renew a canceled subscription
    const data = await this.db().paramExecute(
      `
        SELECT ${this.generateSelectFields()} FROM \`${DbTables.SUBSCRIPTION}\`
        WHERE stripeId = @stripeId
        ORDER BY createTime DESC
        LIMIT 1;
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
        FROM \`${DbTables.SUBSCRIPTION}\` s
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

  public async getExpiredSubscriptions(
    daysAgo: number,
    activeOnly = true,
    conn?: PoolConnection,
    packageId?: SubscriptionPackageId,
  ): Promise<this[]> {
    if (!Number.isInteger(daysAgo) || daysAgo < 0) {
      throw new Error('daysAgo should be a non-negative integer');
    }

    return await this.getContext().mysql.paramExecute(
      `
      SELECT ${this.generateSelectFields()}
      FROM \`${DbTables.SUBSCRIPTION}\`
      WHERE expiresOn BETWEEN DATE_SUB(CURRENT_DATE, INTERVAL @daysAgo DAY) AND CURRENT_DATE
      ${activeOnly ? ` AND status = ${SqlModelStatus.ACTIVE}` : ''}
      ${packageId ? ` AND package_id = ${packageId}` : ''}
      `,
      { daysAgo },
      conn,
    );
  }

  public async updateQuotaWarningLevel(
    quotaWarningLevel: QuotaWarningLevel,
    conn?: PoolConnection,
  ) {
    await this.db().paramExecute(
      `
        UPDATE \`${DbTables.SUBSCRIPTION}\`
        SET \`quotaWarningLevel\` = @quotaWarningLevel
        WHERE stripeId = @stripeId
      `,
      { stripeId: this.stripeId, quotaWarningLevel },
      conn,
    );
  }

  public async deactivateSubscriptions(ids: number[]) {
    if (!ids.length) {
      return;
    }

    await this.getContext().mysql.paramExecute(
      `UPDATE \`${DbTables.SUBSCRIPTION}\` SET status = ${SqlModelStatus.INACTIVE} WHERE id IN (${ids.map((id) => `'${id}'`).join(',')})`,
    );
  }

  /**
   * Get projects which have active subscription
   * @param subscriptionPackageId optional subscriptionPackageId
   * @returns array of objects with project_uuid and package_id property
   */
  public async getProjectsWithActiveSubscription(
    subscriptionPackageId: number = null,
  ): Promise<this[]> {
    return await this.getContext().mysql.paramExecute(
      `
      SELECT project_uuid, package_id
      FROM \`${DbTables.SUBSCRIPTION}\`
      WHERE (@subscriptionPackageId IS NULL OR package_id = @subscriptionPackageId)
      AND (expiresOn IS NULL OR expiresOn > NOW())
      AND status = ${SqlModelStatus.ACTIVE}
      `,
      {
        subscriptionPackageId,
      },
    );
  }
}
