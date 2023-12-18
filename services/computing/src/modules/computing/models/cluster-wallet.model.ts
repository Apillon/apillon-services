import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  Context,
  PoolConnection,
  PopulateFrom,
  presenceValidator,
  prop,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { ComputingErrorCode, DbTables } from '../../../config/types';
import { ethers } from 'ethers';

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
}
