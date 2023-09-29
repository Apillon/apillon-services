import { dateParser, integerParser, stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  PopulateFrom,
  prop,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { DbTables } from '../../../config/types';

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
    ],
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
    ],
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
    ],
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
      SerializeFor.SERVICE,
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
}
