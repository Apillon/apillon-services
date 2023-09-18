import {
  booleanParser,
  dateParser,
  integerParser,
  stringParser,
} from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  enumInclusionValidator,
  PopulateFrom,
  presenceValidator,
  prop,
  SerializeFor,
  SqlModelStatus,
  SubscriptionPackages,
} from '@apillon/lib';
import { ConfigErrorCode, DbTables } from '../../../config/types';

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
      SerializeFor.SERVICE,
    ],
  })
  public project_uuid: number;

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
      SerializeFor.SERVICE,
    ],
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
      SerializeFor.SERVICE,
    ],
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
}
