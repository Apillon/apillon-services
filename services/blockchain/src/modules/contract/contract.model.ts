import {
  AdvancedSQLModel,
  ChainType,
  Context,
  EvmChain,
  Lmas,
  LogType,
  PopulateFrom,
  SerializeFor,
  ServiceName,
  SubstrateChain,
  enumInclusionValidator,
  formatTokenWithDecimals,
  formatWalletAddress,
  presenceValidator,
  prop,
} from '@apillon/lib';
import { dateParser, integerParser, stringParser } from '@rawmodel/parsers';
import { BlockchainErrorCode, Chain, DbTables } from '../../config/types';
import { ethers } from 'ethers';

// For enum inclusion validator
const EvmOrSubstrateChain = { ...EvmChain, ...SubstrateChain };
export class Contract extends AdvancedSQLModel {
  public readonly tableName = DbTables.CONTRACT;

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
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.WORKER,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: BlockchainErrorCode.CONTRACT_REQUIRED_DATA_NOT_PRESENT,
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
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.WORKER,
    ],
    validators: [
      {
        resolver: enumInclusionValidator(EvmOrSubstrateChain, false),
        code: BlockchainErrorCode.CONTRACT_INVALID_CHAIN,
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
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
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
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.WORKER,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: BlockchainErrorCode.CONTRACT_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public abi: string;

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

  @prop({
    parser: { resolver: dateParser() },
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
  public lastParsedBlockUpdateTime: Date;

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
    defaultValue: 50,
  })
  public minBalance: string;

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
  public currentBalance: string;

  @prop({
    parser: { resolver: dateParser() },
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
  public lastBalanceAlertTime: Date;

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

  private calculateTokenBalance() {
    if (!this.decimals) {
      return this;
    }
    try {
      this.minTokenBalance = ethers.BigNumber.from(this.minBalance)
        .div(ethers.BigNumber.from(10).pow(this.decimals))
        .toNumber()
        .toFixed(4);
    } catch (err) {
      try {
        this.minTokenBalance = ethers.BigNumber.from(this.minBalance)
          .div(ethers.BigNumber.from(10).pow(this.decimals))
          .toString();
      } catch (err) {
        console.error(err);
      }
    }
    try {
      this.currentTokenBalance = ethers.BigNumber.from(this.currentBalance)
        .div(ethers.BigNumber.from(10).pow(this.decimals))
        .toNumber()
        .toFixed(4);
    } catch (err) {
      try {
        this.currentTokenBalance = ethers.BigNumber.from(this.currentBalance)
          .div(ethers.BigNumber.from(10).pow(this.decimals))
          .toString();
      } catch (err) {
        console.log(err);
      }
    }

    return this;
  }

  public async checkBalance(provider: ethers.providers.JsonRpcProvider) {
    if (!this.minBalance) return;

    //Check balance in cluster and perform alerting, if necessary
    try {
      const date = new Date();
      const FIFTEEN_MIN = 15 * 60 * 1000;
      this.currentBalance = (
        await provider.getBalance(this.address)
      ).toString();

      if (
        ethers.BigNumber.from(this.currentBalance) <
          ethers.BigNumber.from(this.minBalance) &&
        (!this.lastBalanceAlertTime ||
          date.getTime() - new Date(this.lastBalanceAlertTime).getTime() >
            FIFTEEN_MIN)
      ) {
        await new Lmas().sendAdminAlert(
          `LOW CONTRACT BALANCE! ${formatWalletAddress(
            this.chainType,
            this.chain,
            this.address,
          )} ==> balance: ${formatTokenWithDecimals(
            this.currentBalance,
            this.decimals,
          )} / ${formatTokenWithDecimals(this.minBalance, this.decimals)}`,
          ServiceName.BLOCKCHAIN,
          LogType.WARN,
        );

        this.lastBalanceAlertTime = new Date();
      }
    } catch (err) {
      console.error('Error checking contract balance!', err);
    }
  }
}
