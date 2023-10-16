import { dateParser, integerParser, stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  getFaker,
  PoolConnection,
  PopulateFrom,
  prop,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { DbTables } from '../../../config/types';
import { v4 as uuid } from 'uuid';

export class SubscriptionPackage extends AdvancedSQLModel {
  public readonly tableName = DbTables.SUBSCRIPTION_PACKAGE;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
    ],
    fakeValue: getFaker().word.noun(),
  })
  public name: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
    ],
    fakeValue: getFaker().lorem.sentence(),
  })
  public description: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
  })
  public isDefault: boolean;

  /**
   * Stripe unique ID - determines package price
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.PROFILE,
    ],
    fakeValue: uuid(),
  })
  public stripeId: string;

  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
  })
  public deactivationDate: Date;

  /**
   * Amount of credits given to project when subscribing to a package
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
    ],
  })
  public creditAmount: number;

  public async getAll(serializationStrategy = SerializeFor.PROFILE) {
    return await this.getContext().mysql.paramExecute(
      `
      SELECT ${this.generateSelectFields('sp', '', serializationStrategy)}
      FROM \`${this.tableName}\` sp
      WHERE sp.status = ${SqlModelStatus.ACTIVE}
      `,
      {},
    );
  }

  public async populateByStripeId(stripeId: string, conn?: PoolConnection) {
    if (!stripeId) {
      throw new Error('stripeId should not be null');
    }
    const data = await this.db().paramExecute(
      `
        SELECT * FROM \`${this.tableName}\`
        WHERE stripeId = @stripeId
        AND status = ${SqlModelStatus.ACTIVE}
      `,
      { stripeId },
      conn,
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }
}
