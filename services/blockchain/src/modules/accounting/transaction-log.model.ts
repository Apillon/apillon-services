import {
  AdvancedSQLModel,
  ChainType,
  Context,
  PopulateFrom,
  presenceValidator,
  prop,
  SerializeFor,
  SubstrateChain,
} from '@apillon/lib';
import {
  dateParser,
  floatParser,
  integerParser,
  stringParser,
} from '@rawmodel/parsers';
import { ethers } from 'ethers';
import { Wallet } from '../../common/models/wallet';

import { BlockchainErrorCode, DbTables } from '../../config/types';

export enum TxStatus {
  PENDING = 1,
  COMPLETED = 5,
  FAILED = 9,
}

export enum TxDirection {
  INCOME = 1,
  OUTCOME = 2,
}

export enum TxToken {
  CRUST_TOKEN = 'CRU',
  KILT_TOKEN = 'KILT',
  MOONBASE_TOKEN = 'DEV',
  MOONBEAM_TOKEN = 'GLMR',
  PHALA_TOKEN = 'PHA',
  POLKADOT_TOKEN = 'DOT',
  ETH = 'ETH',
  USDC = 'USDC',
  USDT = 'USDT',
}

export enum TxAction {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  TRANSACTION = 'TRANSACTION',
  UNKNOWN = 'UNKNOWN',
}

export class TransactionLog extends AdvancedSQLModel {
  public readonly tableName = DbTables.TRANSACTION_LOG;

  @prop({
    parser: { resolver: dateParser() },
    populatable: [
      PopulateFrom.DB, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: BlockchainErrorCode.TRANSACTION_LOG_TIMESTAMP_NOT_PRESENT,
      },
    ],
  })
  public ts: Date;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: BlockchainErrorCode.TRANSACTION_LOG_BLOCK_ID_NOT_PRESENT,
      },
    ],
  })
  public blockId: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: BlockchainErrorCode.TRANSACTION_LOG_STATUS_NOT_PRESENT,
      },
    ],
  })
  public status: TxStatus;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: BlockchainErrorCode.TRANSACTION_LOG_DIRECTION_NOT_PRESENT,
      },
    ],
  })
  public direction: TxDirection;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: BlockchainErrorCode.TRANSACTION_LOG_ACTION_NOT_PRESENT,
      },
    ],
  })
  public action: TxAction;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: BlockchainErrorCode.TRANSACTION_LOG_CHAIN_NOT_PRESENT,
      },
    ],
  })
  public chain: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: BlockchainErrorCode.TRANSACTION_LOG_CHAIN_TYPE_NOT_PRESENT,
      },
    ],
  })
  public chainType: ChainType;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: BlockchainErrorCode.TRANSACTION_LOG_WALLET_NOT_PRESENT,
      },
    ],
  })
  public wallet: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
  })
  public addressFrom: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB, //
    ],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
  })
  public addressTo: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: BlockchainErrorCode.TRANSACTION_LOG_TX_HASH_NOT_PRESENT,
      },
    ],
  })
  public hash: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
  })
  public transactionQueue_id: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: BlockchainErrorCode.TRANSACTION_LOG_TOKEN_NOT_PRESENT,
      },
    ],
  })
  public token: TxToken;

  /**
   * amount of tokens, represented in smallest fraction, parsed to string
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: BlockchainErrorCode.TRANSACTION_LOG_AMOUNT_NOT_PRESENT,
      },
    ],
  })
  public amount: string;

  /**
   * transaction fee, represented in smallest fraction, parsed to string
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
  })
  public fee: string;

  /**
   * total = amount + fee, represented in smallest fraction, parsed to string
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
  })
  public totalPrice: string;

  /**
   * Value represented in USD
   */
  @prop({
    parser: { resolver: floatParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
    ],
  })
  public value: number;

  public constructor(data?: any, context?: Context) {
    super(data, context);
  }

  public createFromCrustIndexerData(data: any, wallet: Wallet) {
    this.ts = data?.timestamp;
    this.blockId = data?.blockNumber;
    this.addressFrom = data?.from?.id;
    this.addressTo = data?.to?.id;
    this.amount = data?.amount;
    this.fee = data?.fee;
    this.calculateTotalPrice();
    this.hash = data?.extrinsicHash;
    this.wallet = wallet.address;

    this.status = data?.status === 0 ? TxStatus.COMPLETED : TxStatus.FAILED;
    this.chainType = wallet.chainType;
    this.chain = wallet.chain;
    this.token = TxToken.CRUST_TOKEN;
    if (data.transactionType === 0) {
      if (this.addressFrom === this.wallet) {
        this.direction = TxDirection.OUTCOME;
        this.action = TxAction.WITHDRAWAL;
      } else if (this.addressTo === this.wallet) {
        this.direction = TxDirection.INCOME;
        this.action = TxAction.DEPOSIT;
      } else {
        throw new Error('Inconsistent transaction addresses!');
      }
    }
    return this;
  }

  public calculateTotalPrice() {
    this.totalPrice = ethers.BigNumber.from(this.amount)
      .add(ethers.BigNumber.from(this.fee))
      .toString();
    return this;
  }
}
