import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  Chain,
  Context,
  PoolConnection,
  PopulateFrom,
  prop,
  SerializeFor,
} from '@apillon/lib';
import { DbTables } from '../../config/types';

export class Transaction extends AdvancedSQLModel {
  public readonly tableName = DbTables.TRANSACTION_QUEUE;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  /**
   * nonce
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
    ],
  })
  public nonce: number;

  /**
   * @dev Blockchain address - can be EVM or polkadot based.
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
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.PROFILE,
    ],
  })
  public chain: Chain;

  /**
   * Transaction hash
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
  })
  public transactionHash: string;

  /**
   * Reference table
   * @dev Name of the table the request came from. Used for loose linking transaction to origin.
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
  })
  public referenceTable: string;

  /**
   * Reference table id.
   * @dev Name of the table the request came from. Used for loose linking transaction to origin.
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
  })
  public referenceId: string;

  /**
   * rawTransaction
   * @dev Signed serialized raw transaction.
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
  public rawTransaction: string;

  public async getList(
    chain: Chain,
    address: string,
    nonce: number,
    conn?: PoolConnection,
  ) {
    return await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${this.tableName}\`
      WHERE chain = @chain
      AND address = @address
      AND nonce > @nonce
      order by nonce ASC;
      `,
      { chain, address, nonce },
      conn,
    );
  }
}
