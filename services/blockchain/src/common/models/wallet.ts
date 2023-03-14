import { dateParser, integerParser, stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  Chain,
  Context,
  enumInclusionValidator,
  PoolConnection,
  PopulateFrom,
  presenceValidator,
  prop,
  SerializeFor,
} from '@apillon/lib';
import {
  BlockchainErrorCode,
  DbTables,
  SqlModelStatus,
} from '../../config/types';

export class Wallet extends AdvancedSQLModel {
  public readonly tableName = DbTables.WALLET;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  /**
   * address
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: BlockchainErrorCode.WALLET_ADDRESS_NOT_PRESENT,
      },
    ],
  })
  public address: string;

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
      SerializeFor.INSERT_DB,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: enumInclusionValidator(Chain, false),
        code: BlockchainErrorCode.WALLET_INVALID_CHAIN,
      },
    ],
  })
  public chain: Chain;

  /**
   * seed
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: BlockchainErrorCode.WALLET_SEED_NOT_PRESENT,
      },
    ],
  })
  public seed: string;

  /**
   * nextNonce
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.SERVICE,
    ],
    defaultValue: 0,
  })
  public nextNonce: number;

  /**
   * lastProcessedNonce
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
    ],
    defaultValue: -1,
  })
  public lastProcessedNonce: number;

  /**
   * usageTimestamp
   */
  @prop({
    parser: { resolver: dateParser() },
    populatable: [
      PopulateFrom.DB, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.SERVICE,
    ],
  })
  public usageTimestamp: Date;

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
      SerializeFor.INSERT_DB,
      SerializeFor.SERVICE,
    ],
  })
  public type: number;

  public async populateByLeastUsed(
    chain: Chain,
    conn?: PoolConnection,
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
      ORDER BY usageTimestamp ASC
      LIMIT 1
      FOR UPDATE;
      `,
      { chain },
      conn,
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    } else {
      return this.reset();
    }
  }

  public async populateByAddress(
    chain: Chain,
    address: string,
    conn?: PoolConnection,
  ): Promise<this> {
    if (!chain) {
      throw new Error('chain should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT * 
      FROM \`${this.tableName}\`
      WHERE 
        chain = @chain
        AND address = @address
        AND status <> ${SqlModelStatus.DELETED}
      ORDER BY usageTimestamp ASC
      LIMIT 1
      FOR UPDATE;
      `,
      { chain, address: address.toLowerCase() },
      conn,
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    } else {
      return this.reset();
    }
  }

  // always iterate inside a transaction
  public async iterateNonce(conn: PoolConnection) {
    await this.getContext().mysql.paramExecute(
      `
      UPDATE \`${this.tableName}\`
      SET nextNonce = nextNonce + 1, 
      usageTimestamp = now()
      WHERE id = @id;
      `,
      { id: this.id },
      conn,
    );
  }

  public async getList(chain: Chain, address?: string, conn?: PoolConnection) {
    return await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${this.tableName}\`
      WHERE chain = @chain
      AND (@address IS NULL OR address = @address);
      `,
      { chain, address: address || null },
      conn,
    );
  }
}
