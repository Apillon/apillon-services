import { dateParser, integerParser, stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  BaseQueryFilter,
  ChainType,
  Context,
  enumInclusionValidator,
  EvmChain,
  getQueryParams,
  WalletTransactionsQueryFilter,
  PoolConnection,
  PopulateFrom,
  presenceValidator,
  prop,
  selectAndCountQuery,
  SerializeFor,
  SubstrateChain,
} from '@apillon/lib';
import {
  BlockchainErrorCode,
  Chain,
  DbTables,
  SqlModelStatus,
} from '../../config/types';
import { Endpoint } from '../../common/models/endpoint';
import { ethers } from 'ethers';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { TransactionLog } from '../accounting/transaction-log.model';

// For enum inclusion validator
const EvmOrSubstrateChain = { ...EvmChain, ...SubstrateChain };
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
      SerializeFor.WORKER,
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
      SerializeFor.WORKER,
    ],
    validators: [
      {
        resolver: enumInclusionValidator(EvmOrSubstrateChain, false),
        code: BlockchainErrorCode.WALLET_INVALID_CHAIN,
      },
    ],
  })
  public chain: Chain;

  /**
   * chainType
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
      SerializeFor.WORKER,
    ],
  })
  public chainType: ChainType;

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
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
    ],
    defaultValue: -1,
  })
  public lastProcessedNonce: number;

  /**
   * lastParsedBlock
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
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
    ],
  })
  public lastParsedBlock: number;

  /**
   * maxParsedBlock
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
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
    ],
    defaultValue: 50,
  })
  public blockParseSize: number;

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
      SerializeFor.UPDATE_DB,
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

  /**
   * minBalance - string representation of BigNumber
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      //
      PopulateFrom.DB,
      PopulateFrom.ADMIN,
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.WORKER,
    ],
  })
  public minBalance: string;

  /**
   * virtual - min balance in base token
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [],
    serializable: [SerializeFor.ADMIN],
  })
  public minTokenBalance: string;

  /**
   * currentBalance - string representation of BigNumber
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      //
      PopulateFrom.DB,
      PopulateFrom.ADMIN,
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.SERVICE,
      SerializeFor.WORKER,
    ],
  })
  public currentBalance: string;

  /**
   * virtual - current balance in base token
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [],
    serializable: [SerializeFor.ADMIN],
  })
  public currentTokenBalance: string;

  /**
   * decimals - token decimals
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      //
      PopulateFrom.DB,
      PopulateFrom.ADMIN,
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
    ],
  })
  public decimals: number;

  /**
   * token - token symbol
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      //
      PopulateFrom.DB,
      PopulateFrom.ADMIN,
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
    ],
  })
  public token: string;

  public async populateById(
    id: string | number,
    conn?: PoolConnection,
    forUpdate?: boolean,
  ): Promise<this> {
    return (
      await super.populateById(id, conn, forUpdate)
    ).calculateTokenBalance();
  }

  public async populateByLeastUsed(
    chain: Chain,
    chainType: ChainType,
    conn?: PoolConnection,
  ): Promise<this> {
    if (!chain) {
      throw new Error('chain should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${DbTables.WALLET}\`
      WHERE
      chainType = @chainType
      AND chain = @chain
      AND status <> ${SqlModelStatus.DELETED}
      ORDER BY usageTimestamp ASC
      LIMIT 1
      FOR UPDATE;
      `,
      { chain, chainType },
      conn,
    );

    if (data?.length) {
      if (data[0].chainType === ChainType.EVM) {
        data[0].address = data[0].address.toLowerCase();
      }
      return this.populate(data[0], PopulateFrom.DB).calculateTokenBalance();
    } else {
      return this.reset();
    }
  }

  public async populateByAddress(
    chain: Chain,
    chainType: ChainType,
    address: string,
    conn?: PoolConnection,
  ): Promise<this> {
    if (!chain) {
      throw new Error('chain should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${DbTables.WALLET}\`
      WHERE
        chainType = @chainType
        AND chain = @chain
        -- case insensitive comparison
        AND address like @address
        AND status <> ${SqlModelStatus.DELETED}
      ORDER BY usageTimestamp ASC
      LIMIT 1
      FOR UPDATE;
      `,
      { chain, chainType, address: address.toLowerCase() },
      conn,
    );

    if (data?.length) {
      return this.populate(data[0], PopulateFrom.DB).calculateTokenBalance();
    }
    return this.reset();
  }

  public calculateTokenBalance() {
    if (!this.decimals) {
      return this;
    }
    this.minTokenBalance = ethers.BigNumber.from(this.minBalance)
      .div(Math.pow(10, this.decimals))
      .toString();
    this.currentTokenBalance = ethers.BigNumber.from(this.currentBalance)
      .div(Math.pow(10, this.decimals))
      .toString();

    return this;
  }

  public async updateLastProcessedNonce(
    lastProcessedNonce: number,
    conn?: PoolConnection,
  ) {
    await this.getContext().mysql.paramExecute(
      `
      UPDATE \`${DbTables.WALLET}\`
      SET lastProcessedNonce = @lastProcessedNonce
      WHERE id = @id;
      `,
      { lastProcessedNonce, id: this.id },
      conn,
    );
    this.lastProcessedNonce = lastProcessedNonce;
  }

  public async updateLastParsedBlock(
    lastParsedBlock: number,
    conn?: PoolConnection,
  ) {
    await this.getContext().mysql.paramExecute(
      `
      UPDATE \`${DbTables.WALLET}\`
      SET lastParsedBlock = @lastParsedBlock
      WHERE id = @id;
      `,
      { lastParsedBlock, id: this.id },
      conn,
    );
    this.lastParsedBlock = lastParsedBlock;
  }

  // always iterate inside a transaction
  public async iterateNonce(conn: PoolConnection) {
    await this.getContext().mysql.paramExecute(
      `
      UPDATE \`${DbTables.WALLET}\`
      SET nextNonce = nextNonce + 1,
      usageTimestamp = now()
      WHERE id = @id;
      `,
      { id: this.id },
      conn,
    );
  }

  public async getWallets(
    chain: Chain = null,
    chainType: ChainType = null,
    address: string = null,
    conn?: PoolConnection,
  ) {
    return await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${DbTables.WALLET}\`
      WHERE
      status = ${SqlModelStatus.ACTIVE}
      AND (@chainType IS NULL OR chainType = @chainType)
      AND (@chain IS NULL OR chain = @chain)
      AND (@address IS NULL OR address like @address);
      `,
      { chainType, chain, address },
      conn,
    );
  }

  public async listWallets(query: BaseQueryFilter) {
    const filter = new BaseQueryFilter(query);
    const fieldMap = { id: 'w.id' };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'w',
      fieldMap,
      filter.serialize(),
    );
    const sqlQuery = {
      qSelect: `SELECT
        ${this.generateSelectFields()},
        w.minBalance / POW(10, w.decimals) as minTokenBalance,
        w.currentBalance / POW(10, w.decimals) as currentTokenBalance
      `,
      qFrom: `FROM ${DbTables.WALLET} w
        WHERE (@search IS null OR w.address LIKE CONCAT('%', @search, '%'))
        AND w.status <> ${SqlModelStatus.DELETED}`,
      qFilter: `
          ORDER BY ${filters.orderStr}
          LIMIT ${filters.limit} OFFSET ${filters.offset};
        `,
    };

    return selectAndCountQuery(
      this.getContext().mysql,
      sqlQuery,
      params,
      'w.id',
    );
  }

  public async checkAndUpdateBalance() {
    let balance = null;
    const endpoint = await new Endpoint({}, this.getContext()).populateByChain(
      this.chain,
      this.chainType,
    );

    if (!endpoint.exists()) {
      throw new Error('Endpoint does not exits');
    }
    if (this.chainType === ChainType.EVM) {
      const provider = new ethers.providers.JsonRpcProvider(endpoint.url);
      balance = (await provider.getBalance(this.address)).toString();
    }
    if (this.chainType === ChainType.SUBSTRATE) {
      const provider = new WsProvider(endpoint.url);
      const api = await ApiPromise.create({
        provider,
      });
      const account = (await api.query.system.account(this.address)) as any;
      balance = account.data.free.toString();
    }

    if (!balance && balance !== '0') {
      throw new Error('Can not check balance!');
    }

    this.currentBalance = balance;
    await this.update();

    return {
      balance,
      minBalance: this.minBalance,
      isBelowThreshold: this.minBalance
        ? ethers.BigNumber.from(this.minBalance).gte(
            ethers.BigNumber.from(balance),
          )
        : null,
    };
  }

  public async getTransactions(
    walletAddress: string,
    filter: WalletTransactionsQueryFilter,
  ) {
    const fieldMap = { id: 't.id' };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      't',
      fieldMap,
      filter.serialize(),
    );

    const sqlQuery = {
      qSelect: `SELECT ${new TransactionLog(
        {},
        this.getContext(),
      ).generateSelectFields('', '', SerializeFor.ADMIN)}`,
      qFrom: `FROM \`${DbTables.TRANSACTION_LOG}\` t
        WHERE t.wallet = '${walletAddress}'
        AND (@search IS null OR t.hash LIKE CONCAT('%', @search, '%'))
        AND (@status IS NULL OR t.status = @status)
        `,
      qFilter: `
          ORDER BY ${filters.orderStr || 't.ts DESC'}
          LIMIT ${filters.limit} OFFSET ${filters.offset};
        `,
    };

    return selectAndCountQuery(
      this.getContext().mysql,
      sqlQuery,
      { ...params },
      't.id',
    );
  }
}
