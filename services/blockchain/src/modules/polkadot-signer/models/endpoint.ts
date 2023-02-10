import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  Chain,
  Context,
  PopulateFrom,
  prop,
  SerializeFor,
} from '@apillon/lib';
import { DbTables, SqlModelStatus } from '../../../config/types';

export class Endpoint extends AdvancedSQLModel {
  public readonly tableName = DbTables.ENDPOINT;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  /**
   * url
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
    ],
  })
  public url: string;

  /**
   * chain
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
    ],
  })
  public chain: Chain;

  /**
   * priority
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
    ],
  })
  public priority: number;

  /**
   * type
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
    ],
  })
  public type: number;

  public async populateByChain(
    chain: Chain,
    priority: number = null,
  ): Promise<this> {
    if (!chain) {
      throw new Error('chain should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT * 
      FROM \`${this.tableName}\`
      WHERE (chain = @chain)
      AND status <> ${SqlModelStatus.DELETED}
      AND (@priority IS NULL OR @priority = priority)
      LIMIT 1;
      `,
      { chain, priority },
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    } else {
      return this.reset();
    }
  }
}
