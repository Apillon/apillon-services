import { dateParser, integerParser, stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  ChainType,
  Context,
  enumInclusionValidator,
  EvmChain,
  PoolConnection,
  PopulateFrom,
  presenceValidator,
  prop,
  SerializeFor,
  SubstrateChain,
} from '@apillon/lib';
import {
  BlockchainErrorCode,
  Chain,
  DbTables,
  SqlModelStatus,
} from '../../config/types';
import { Endpoint } from './endpoint';
import { ethers } from 'ethers';
import { ApiPromise, WsProvider } from '@polkadot/api';

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
        resolver: enumInclusionValidator(EvmChain && SubstrateChain, false),
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
      PopulateFrom.DB, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.SERVICE,
      SerializeFor.WORKER,
    ],
  })
  public minBalance: string;

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

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
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
        AND address = @address
        AND status <> ${SqlModelStatus.DELETED}
      ORDER BY usageTimestamp ASC
      LIMIT 1
      FOR UPDATE;
      `,
      { chain, chainType, address: address.toLowerCase() },
      conn,
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    } else {
      return this.reset();
    }
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

  public async getList(
    chain: Chain,
    chainType: ChainType,
    address?: string,
    conn?: PoolConnection,
  ) {
    return await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${DbTables.WALLET}\`
      WHERE 
      status = ${SqlModelStatus.ACTIVE}
      AND chainType = @chainType
      AND chain = @chain
      AND (@address IS NULL OR address = @address);
      `,
      { chainType, chain, address: address || null },
      conn,
    );
  }

  public async getAllWallets(
    chain: Chain = null,
    chainType: ChainType = null,
    conn?: PoolConnection,
  ): Promise<Wallet[]> {
    const resp = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${DbTables.WALLET}\`
      WHERE 
      status = ${SqlModelStatus.ACTIVE}
      AND (@chainType IS NULL OR chainType = @chainType)
      AND (@chain IS NULL OR chain = @chain);
      `,
      { chainType, chain },
      conn,
    );

    return resp?.map((x) => new Wallet(x, this.getContext())) || [];
  }

  public async checkBallance() {
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
}
