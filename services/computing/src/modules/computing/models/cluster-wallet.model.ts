import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  ClusterWalletQueryFilter,
  Context,
  getQueryParams,
  PoolConnection,
  PopulateFrom,
  presenceValidator,
  prop,
  selectAndCountQuery,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { ComputingErrorCode, DbTables } from '../../../config/types';
import { ethers } from 'ethers';
import { ServiceContext } from '@apillon/service-lib';

export class ClusterWallet extends AdvancedSQLModel {
  public readonly tableName = DbTables.CLUSTER_WALLET;
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
        code: ComputingErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public clusterId: string;

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
        code: ComputingErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public walletAddress: string;

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
   * totalBalance (including locked tokens for storage) - string representation of BigNumber
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      //
      PopulateFrom.DB,
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
  public totalBalance: string;

  /**
   * currentBalance - string representation of BigNumber
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      //
      PopulateFrom.DB,
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
  public decimals: number;

  /**
   * token - token symbol
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
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
    ],
  })
  public token: string;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  public get isBelowThreshold(): boolean {
    return (
      !!this.minBalance &&
      ethers.BigNumber.from(this.minBalance).gte(
        ethers.BigNumber.from(this.currentBalance),
      )
    );
  }

  public async getClusterWalletIds(conn?: PoolConnection) {
    return await this.getContext().mysql.paramExecute(
      `
      SELECT id
      FROM \`${DbTables.CLUSTER_WALLET}\`
      WHERE
      status = ${SqlModelStatus.ACTIVE};
      `,
      {},
      conn,
    );
  }

  public async getList(
    context: ServiceContext,
    filter: ClusterWalletQueryFilter,
  ) {
    const fieldMap = {
      id: 'cw.id',
    };
    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'cw',
      fieldMap,
      filter.serialize(),
    );
    const selectFields = this.generateSelectFields(
      'cw',
      '',
      SerializeFor.SELECT_DB,
    );
    const sqlQuery = {
      qSelect: `
        SELECT ${selectFields}
        `,
      qFrom: `
        FROM \`${DbTables.CLUSTER_WALLET}\` cw
        WHERE @walletAddress = cw.walletAddress
      `,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    return await selectAndCountQuery(context.mysql, sqlQuery, params, 'cw.id');
  }
}
