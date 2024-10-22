import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  BaseQueryFilter,
  ChainType,
  Context,
  enumInclusionValidator,
  EvmChain,
  getQueryParams,
  jsonArrayParser,
  PoolConnection,
  PopulateFrom,
  presenceValidator,
  prop,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
  SubstrateChain,
} from '@apillon/lib';
import { BlockchainErrorCode, Chain, DbTables } from '../../config/types';

const EvmOrSubstrateChain = { ...EvmChain, ...SubstrateChain };

export class MultisigWallet extends AdvancedSQLModel {
  public readonly tableName = DbTables.MULTISIG_WALLET;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  /**
   * chain
   */
  @prop({
    parser: { resolver: integerParser() },
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
    populatable: [PopulateFrom.DB],
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
   * description
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
        code: BlockchainErrorCode.WALLET_SEED_NOT_PRESENT,
      },
    ],
  })
  public description: string;

  /**
   * signers
   */
  @prop({
    parser: { resolver: jsonArrayParser },
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
        code: BlockchainErrorCode.WALLET_SEED_NOT_PRESENT,
      },
    ],
  })
  public signers: string[];

  /**
   * threshold
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.SERVICE,
    ],
    defaultValue: 2,
  })
  public threshold: number;

  public override async populateById(
    id: string | number,
    conn?: PoolConnection,
    forUpdate?: boolean,
  ): Promise<this> {
    return await super.populateById(id, conn, forUpdate);
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
      FROM \`${DbTables.MULTISIG_WALLET}\`
      WHERE
        chainType = @chainType
        AND chain = @chain
        -- case insensitive comparison
        AND address like @address
        AND status = ${SqlModelStatus.ACTIVE}
      ORDER BY usageTimestamp ASC
      LIMIT 1
      FOR UPDATE;
      `,
      { chain, chainType, address: address.toLowerCase() },
      conn,
    );

    if (data?.length) {
      return this.populate(data[0], PopulateFrom.DB);
    }
    return this.reset();
  }

  public async populateByChain(chain: Chain): Promise<this> {
    if (!chain) {
      throw new Error('chain should not be null');
    }

    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${DbTables.MULTISIG_WALLET}\`
      WHERE
        chain = @chain
        AND status = ${SqlModelStatus.ACTIVE}
      LIMIT 1;
      `,
      { chain },
    );

    if (data?.length) {
      return this.populate(data[0], PopulateFrom.DB);
    }
    return this.reset();
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
      FROM \`${DbTables.MULTISIG_WALLET}\`
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

  public async listWallets(query: BaseQueryFilter): Promise<{
    total: number;
    limit: number;
    page: number;
    items: MultisigWallet[];
  }> {
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
        w.createTime,
        w.updateTime
      `,
      qFrom: `FROM ${DbTables.MULTISIG_WALLET} w
        WHERE (@search IS null OR w.address LIKE CONCAT('%', @search, '%'))
        AND w.status <> ${SqlModelStatus.DELETED}`,
      qFilter: `
          ORDER BY ${filters.orderStr}
          LIMIT ${filters.limit} OFFSET ${filters.offset};
        `,
    };

    const data = await selectAndCountQuery(
      this.getContext().mysql,
      sqlQuery,
      params,
      'w.id',
    );

    return {
      ...data,
      items: data.items ? data.items.map((item) => this.populate(item)) : [],
    };
  }
}
