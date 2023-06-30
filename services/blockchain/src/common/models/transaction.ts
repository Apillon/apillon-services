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
  public to: string;

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
      SerializeFor.UPDATE_DB,
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
   * Additional data. Can be error, contract deploy address etc.
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
  public data: string;

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
    nonce: number,
    conn?: PoolConnection,
  ) {
    return await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${DbTables.TRANSACTION_QUEUE}\`
      WHERE 
      chainType = @chainType
      AND chain = @chain
      AND address = @address
      AND nonce > @nonce
      order by nonce ASC;
      `,
      { chain, chainType, address, nonce },
      conn,
    );
  }

  // TODO: What about transaction list?? Maybe rename...
  public async getTransactionsByHashes(
    chain: Chain,
    chainType: ChainType,
    address: string,
    transactionStatus: TransactionStatus,
    hashes: string[],
    conn?: PoolConnection,
  ) {
    const data = await this.getContext().mysql.paramExecute(
      `SELECT *
      FROM \`${DbTables.TRANSACTION_QUEUE}\` 
      WHERE 
        transactionHash IN ('${hashes.join("','")}')
        AND chain = @chain
        AND chainType = @chainType
        AND address = @address
        AND transactionStatus = @status`,
      {
        status: transactionStatus,
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

  public async getTransaction(
    chainId: string,
    extrinsicHash: string,
    conn: PoolConnection,
  ) {
    const data = await this.getContext().mysql.paramExecute(
      `SELECT *
      FROM \`${DbTables.TRANSACTION_QUEUE}\`
      WHERE
        chain = @chain
        AND transactionHash = @transactionHash`,
      {
        chain: chainId,
        transactionHash: extrinsicHash,
      },
      conn,
    );
  }

  public async populateByHash(hash: string) {
    const data = await this.db().paramExecute(
      `
        SELECT *
        FROM \`${DbTables.TRANSACTION_QUEUE}\` tq
        WHERE tq.transactionHash = @hash
      `,
      { hash },
    );
    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    }
    return this.reset();
  }

  public async updateTransaction(
    chainId: string,
    extrinsicHash: string,
    conn: PoolConnection,
  ) {
    const data = await this.getContext().mysql.paramExecute(
      `UPDATE \`${DbTables.TRANSACTION_QUEUE}\`
      SET transactionStatus = @status
      WHERE
        chain = @chain
        AND transactionHash = @transactionHash`,
      {
        chain: chainId,
        transactionHash: extrinsicHash,
      },
      conn,
    );

    console.log(chainId, extrinsicHash);

    if (data && data.length) {
      return new Transaction({}, this.getContext()).populate(data);
    }

    return null;
  }

  // public async getTransactionList(
  //   chain: Chain,
  //   chainType: ChainType,
  //   address: string,
  //   conn?: PoolConnection,
  //   transactionStatus?: TransactionStatus,
  // ) {
  //   const data = await this.getContext().mysql.paramExecute(
  //     `SELECT *
  //     FROM \`${DbTables.TRANSACTION_QUEUE}\`
  //     WHERE
  //       chain = @chain
  //       AND chainType = @chainType
  //       AND address = @address
  //       AND (@transactionStatus IS NULL OR transactionStatus = @transactionStatus)`,
  //     {
  //       status: transactionStatus,
  //       address,
  //       chain,
  //       chainType,
  //     },
  //     conn,
  //   );

  //   const res: Transaction[] = [];
  //   if (data && data.length) {
  //     for (const t of data) {
  //       res.push(new Transaction({}, this.getContext()).populate(t));
  //     }
  //   }

  //   return res;
  // }
}
