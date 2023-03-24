import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  ChainType,
  TransactionStatus,
  Context,
  PoolConnection,
  PopulateFrom,
  prop,
  SerializeFor,
} from '@apillon/lib';
import { Chain, DbTables } from '../../config/types';

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
   * Transaction status
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
  public transactionStatus: TransactionStatus;

  /**
   * chainType
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.PROFILE,
    ],
  })
  public chainType: ChainType;

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
    chainType: ChainType,
    address: string,
    transactionsStatus: TransactionStatus,
    nonce: number,
    conn?: PoolConnection,
  ) {
    return await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${this.tableName}\`
      WHERE 
      chainType = @chainType
      AND chain = @chain
      AND address = @address
      AND transactionStatus = @transactionStatus
      AND nonce > @nonce
      order by nonce ASC;
      `,
      { chain, chainType, address, transactionsStatus, nonce },
      conn,
    );
  }

  public async getTransactionsInHashes(
    chain: Chain,
    chainType: ChainType,
    address: string,
    transactionStatus: TransactionStatus,
    hashes: string,
    conn?: PoolConnection,
  ) {
    const data = await this.getContext().mysql.paramExecute(
      `SELECT *
      FROM \`${DbTables.TRANSACTION_QUEUE}\` 
      WHERE 
        transactionHash IN (@hashes)
        AND chain = @chain
        AND chainType = @chainType
        AND address = @address
        AND transactionStatus = @status`,
      {
        status: transactionStatus,
        hashes,
        address,
        chain,
        chainType,
      },
      conn,
    );

    const res: Transaction[] = [];
    if (data && data.length) {
      for (const t of data) {
        res.push(new Transaction({}, this.getContext()).populate(t));
      }
    }

    return res;
  }
}
