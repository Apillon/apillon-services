import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  PopulateFrom,
  prop,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { DbTables } from '../../../config/types';

export class CreditPackage extends AdvancedSQLModel {
  public readonly tableName = DbTables.CREDIT_PACKAGE;

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

  /**
   * Amount of credits given to project when purchasing a package
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

  /**
   * Bonus credits given when purchasing a package
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
  })
  public bonusCredits: number;

  public async getAll(serializationStrategy = SerializeFor.PROFILE) {
    return await this.getContext().mysql.paramExecute(
      `
      SELECT ${this.generateSelectFields('cp', '', serializationStrategy)}
      FROM \`${this.tableName}\` cp
      WHERE cp.status = ${SqlModelStatus.ACTIVE}
      `,
      {},
    );
  }
}
