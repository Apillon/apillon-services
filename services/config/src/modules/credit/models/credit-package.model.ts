import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  getFaker,
  PopulateFrom,
  prop,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { DbTables } from '../../../config/types';
import { v4 as uuid } from 'uuid';

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
      SerializeFor.INSERT_DB,
    ],
    fakeValue: () => getFaker().word.noun(),
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
    fakeValue: () => getFaker().lorem.sentence(),
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
      SerializeFor.INSERT_DB,
      SerializeFor.PROFILE,
    ],
    fakeValue: uuid(),
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
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
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
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
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
