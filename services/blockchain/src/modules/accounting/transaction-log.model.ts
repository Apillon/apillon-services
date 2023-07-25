import {
  AdvancedSQLModel,
  ChainType,
  Context,
  EvmChain,
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
import { Wallet } from '../wallet/wallet.model';

import {
  BlockchainErrorCode,
  DbTables,
  TxAction,
  TxDirection,
  TxStatus,
  TxToken,
} from '../../config/types';
import { getTokenFromChain } from '../../lib/utils';
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
      SerializeFor.INSERT_DB,
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
      SerializeFor.INSERT_DB,
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
      SerializeFor.INSERT_DB,
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
      SerializeFor.INSERT_DB,
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
      SerializeFor.INSERT_DB,
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
      SerializeFor.INSERT_DB,
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
      SerializeFor.INSERT_DB,
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
      SerializeFor.INSERT_DB,
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
      SerializeFor.INSERT_DB,
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
      SerializeFor.INSERT_DB,
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
      SerializeFor.INSERT_DB,
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
      SerializeFor.INSERT_DB,
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
      SerializeFor.INSERT_DB,
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
      SerializeFor.INSERT_DB,
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
      SerializeFor.INSERT_DB,
    ],
  })
  public fee: string;

  /**
   * total = amount + fee, represented in smallest fraction, parsed to string
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
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
      SerializeFor.INSERT_DB,
    ],
  })
  public value: number;

  /**
   * Text describing the transaction, can be edited by admin
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
    ],
  })
  public description: string;

  public constructor(data?: any, context?: Context) {
    super(data, context);
  }

  public createFromCrustIndexerData(data: any, wallet: Wallet) {
    this.ts = data?.timestamp;
    this.blockId = data?.blockNumber;
    this.addressFrom = data?.from?.id;
    this.addressTo = data?.to?.id;
    this.amount = data?.amount;

    this.hash = data?.extrinsicHash;
    this.wallet = wallet.address;

    this.status = data?.status === 0 ? TxStatus.COMPLETED : TxStatus.FAILED;
    this.chainType = wallet.chainType;
    this.chain = wallet.chain;
    this.token = TxToken.CRUST_TOKEN;

    if (this.addressFrom === this.wallet) {
      this.direction = TxDirection.COST;
      this.action =
        data.transactionType === 0 ? TxAction.WITHDRAWAL : TxAction.TRANSACTION;
      this.fee = data?.fee;
    } else if (this.addressTo === this.wallet) {
      this.direction = TxDirection.INCOME;
      this.action =
        data.transactionType === 0 ? TxAction.DEPOSIT : TxAction.TRANSACTION;
    } else {
      throw new Error('Inconsistent transaction addresses!');
    }

    this.calculateTotalPrice();

    return this;
  }

  public createFromKiltIndexerData(data: any, wallet: Wallet) {
    this.ts = data?.createdAt;
    this.blockId = data?.blockNumber;
    this.addressFrom = data?.from;
    this.addressTo = data?.to;
    this.amount = data?.amount;

    this.hash = data?.extrinsicHash;
    this.wallet = wallet.address;

    this.status = data?.status === 1 ? TxStatus.COMPLETED : TxStatus.FAILED;
    this.chainType = wallet.chainType;
    this.chain = wallet.chain;
    this.token = TxToken.KILT_TOKEN;

    if (this.addressFrom === this.wallet) {
      this.direction = TxDirection.COST;
      // TODO: determine action type!
      // this.action =
      //   data.transactionType === 0 ? TxAction.WITHDRAWAL : TxAction.TRANSACTION;
      this.action = TxAction.TRANSACTION;
      this.fee = data?.fee;
    } else if (this.addressTo === this.wallet) {
      this.direction = TxDirection.INCOME;
      // TODO: determine action type!
      // this.action =
      //   data.transactionType === 0 ? TxAction.DEPOSIT : TxAction.TRANSACTION;
      this.action = TxAction.DEPOSIT;
    } else {
      throw new Error('Inconsistent transaction addresses!');
    }

    this.calculateTotalPrice();

    return this;
  }

  public createFromEvmIndexerData(data: any, wallet: Wallet) {
    this.ts = data?.timestamp;
    this.blockId = data?.blockNumber;
    this.addressFrom = data?.from?.toLowerCase();
    this.addressTo = data?.to?.toLowerCase();
    this.amount = data?.value;

    this.hash = data?.hash;
    this.wallet = wallet.address?.toLowerCase();

    this.status = data?.status === 0 ? TxStatus.COMPLETED : TxStatus.FAILED;
    this.chainType = wallet.chainType;
    this.chain = wallet.chain;
    this.token = getTokenFromChain(wallet.chainType, wallet.chain);

    if (this.addressFrom === this.wallet) {
      this.direction = TxDirection.COST;
      this.action = TxAction.TRANSACTION;
      this.fee = ethers.BigNumber.from(data?.gas || 0)
        .mul(ethers.BigNumber.from(data?.gasPrice || 0))
        .toString();
    } else if (this.addressTo === this.wallet) {
      this.direction = TxDirection.INCOME;
      this.action = TxAction.DEPOSIT;
    } else {
      throw new Error(
        `Inconsistent transaction addresses! f:${this.addressFrom} t:${this.addressTo} w:${this.wallet}`,
      );
    }

    this.calculateTotalPrice();

    return this;
  }

  public calculateTotalPrice() {
    this.totalPrice =
      this.direction == TxDirection.INCOME
        ? this.amount
        : ethers.BigNumber.from(this.amount)
            .add(ethers.BigNumber.from(this.fee))
            .toString();
    return this;
  }

  public addToAmount(amount: string) {
    this.amount = ethers.BigNumber.from(this.amount)
      .add(ethers.BigNumber.from(amount))
      .toString();
  }
}
