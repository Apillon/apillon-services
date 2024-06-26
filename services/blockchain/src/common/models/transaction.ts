import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  ChainType,
  Context,
  PoolConnection,
  PopulateFrom,
  prop,
  SerializeFor,
  SqlModelStatus,
  TransactionStatus,
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

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.PROFILE,
    ],
  })
  public project_uuid?: string;

  public async getList(
    chain: Chain,
    chainType: ChainType,
    address: string,
    nonce: number,
    conn?: PoolConnection,
  ): Promise<Transaction[]> {
    return await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${DbTables.TRANSACTION_QUEUE}\`
      WHERE chainType = @chainType
        AND chain = @chain
        AND address = @address
        AND nonce > @nonce
        AND status = ${SqlModelStatus.ACTIVE}
      order by nonce ASC
      LIMIT 1000;
      `,
      { chain, chainType, address, nonce },
      conn,
    );
  }

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
       WHERE transactionHash IN ('${hashes.join("','")}')
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
    if (data?.length) {
      for (const t of data) {
        res.push(new Transaction({}, this.getContext()).populate(t));
      }
    }

    return res;
  }

  public async getTransactionByChainAndHash(
    chain: Chain,
    transactionHash: string,
    conn?: PoolConnection,
  ) {
    const data = await this.getContext().mysql.paramExecute(
      `SELECT *
       FROM \`${DbTables.TRANSACTION_QUEUE}\`
       WHERE transactionHash = @transactionHash
         AND chain = @chain`,
      {
        chain,
        transactionHash,
      },
      conn,
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async getLastTransactionByChainWalletAndNonce(
    chain: Chain,
    walletAddress: string,
    nonce: number,
    conn?: PoolConnection,
  ) {
    const data = await this.getContext().mysql.paramExecute(
      `SELECT *
       FROM \`${DbTables.TRANSACTION_QUEUE}\`
       WHERE address = @walletAddress
         AND chain = @chain
         AND nonce = @nonce
         AND status = @status LIMIT 1`,
      {
        chain,
        walletAddress,
        nonce,
        status: SqlModelStatus.ACTIVE,
      },
      conn,
    );

    return data?.length ? this.populate(data[0], PopulateFrom.DB) : null;
  }
}
