import { Chain } from './../../config/types';
import {
  AdvancedSQLModel,
  ChainType,
  Context,
  PoolConnection,
  PopulateFrom,
  presenceValidator,
  prop,
  SerializeFor,
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
  KiltTransactionType,
  TxAction,
  TxDirection,
  TxStatus,
  TxToken,
} from '../../config/types';
import { getTokenFromChain } from '../../lib/utils';
import {
  SystemEvent,
  TransferTransaction,
} from '../blockchain-indexers/substrate/kilt/data-models';
import { StorageOrderTransaction } from '../blockchain-indexers/substrate/crust/data-models';
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
    populatable: [PopulateFrom.DB],
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
    populatable: [PopulateFrom.DB, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
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
      SerializeFor.UPDATE_DB,
    ],
  })
  public description: string;

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

  public constructor(data?: any, context?: Context) {
    super(data, context);
  }

  public createFromCrustIndexerData(
    data: {
      system: SystemEvent;
      transfers: TransferTransaction[];
      storageOrder: StorageOrderTransaction;
    },
    wallet: Wallet,
  ) {
    this.ts = data?.system?.createdAt;
    this.blockId = data?.system?.blockNumber;
    this.addressFrom = data?.transfers[0]?.from;
    this.addressTo = data?.transfers[0]?.to;
    this.amount = '0';

    for (const transfer of data?.transfers) {
      this.addToAmount(transfer?.amount?.toString() || '0');
    }

    this.hash = data?.system?.extrinsicHash;
    this.wallet = wallet.address;

    this.status =
      data?.system?.status === 1 ? TxStatus.COMPLETED : TxStatus.FAILED;
    this.chainType = wallet.chainType;
    this.chain = wallet.chain;
    this.token = TxToken.CRUST_TOKEN;
    this.fee =
      data?.system?.fee?.toString() || data?.transfers[0]?.fee?.toString();

    if (this.addressFrom === this.wallet) {
      this.direction = TxDirection.COST;

      this.action = !!data?.storageOrder?.id
        ? TxAction.TRANSACTION
        : TxAction.WITHDRAWAL;
    } else if (this.addressTo === this.wallet) {
      this.direction = TxDirection.INCOME;

      this.action = !!data?.storageOrder?.id
        ? TxAction.TRANSACTION
        : TxAction.DEPOSIT;

      if (this.action === TxAction.DEPOSIT) {
        // income fee should not be logged (payed by other wallet)
        this.fee = '0';
      }
    } else {
      this.action = TxAction.UNKNOWN;
      this.direction = TxDirection.UNKNOWN;
    }

    this.calculateTotalPrice();

    return this;
  }

  public createFromKiltIndexerData(
    data: { system: SystemEvent; transfer: TransferTransaction },
    wallet: Wallet,
  ) {
    this.ts = data?.system?.createdAt;
    this.blockId = data?.system?.blockNumber;
    this.addressFrom = data?.transfer?.from;
    this.addressTo = data?.transfer?.to;
    this.amount = data?.transfer?.amount?.toString() || '0';

    this.hash = data?.system?.extrinsicHash;
    this.wallet = wallet.address;

    this.status =
      data?.system?.status === 1 ? TxStatus.COMPLETED : TxStatus.FAILED;
    this.chainType = wallet.chainType;
    this.chain = wallet.chain;
    this.token = TxToken.KILT_TOKEN;
    this.fee = data?.system?.fee?.toString() || data?.transfer?.fee?.toString();

    if (this.addressFrom === this.wallet) {
      this.direction = TxDirection.COST;

      this.action =
        data?.transfer?.transactionType === KiltTransactionType.BALANCE_TRANSFER
          ? TxAction.WITHDRAWAL
          : TxAction.TRANSACTION;
    } else if (this.addressTo === this.wallet) {
      this.direction = TxDirection.INCOME;

      this.action =
        data?.transfer?.transactionType === KiltTransactionType.BALANCE_TRANSFER
          ? TxAction.DEPOSIT
          : TxAction.TRANSACTION;

      if (this.action === TxAction.DEPOSIT) {
        // income fee should not be logged (payed by other wallet)
        this.fee = '0';
      }
    } else {
      // throw new Error('Inconsistent transaction addresses!');
      // some Kilt events does not have both addresses.
      this.action = TxAction.UNKNOWN;
      this.direction = TxDirection.UNKNOWN;
    }

    this.calculateTotalPrice();

    return this;
  }

  public createFromEvmIndexerData(data: any, wallet: Wallet) {
    this.ts = data?.createdAt;
    this.blockId = data?.blockNumber;
    this.addressFrom = data?.from?.toLowerCase();
    this.addressTo = data?.to?.toLowerCase();
    this.amount = data?.value;

    this.hash = data?.transactionHash;
    this.wallet = wallet.address?.toLowerCase();

    this.status = data?.status === 1 ? TxStatus.COMPLETED : TxStatus.FAILED;
    this.chainType = wallet.chainType;
    this.chain = wallet.chain;
    this.token = getTokenFromChain(wallet.chainType, wallet.chain);

    if (this.addressFrom === this.wallet) {
      this.direction = TxDirection.COST;
      this.action = TxAction.TRANSACTION;
      this.fee = ethers.BigNumber.from(data?.gasUsed || 0)
        .mul(ethers.BigNumber.from(data?.effectiveGasPrice || 0))
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
        : ethers.BigNumber.from(this.amount || 0)
            .add(ethers.BigNumber.from(this.fee || 0))
            .toString();
    return this;
  }

  public addToAmount(amount: string) {
    this.amount = ethers.BigNumber.from(this.amount || 0)
      .add(ethers.BigNumber.from(amount || 0))
      .toString();
  }

  public async getTransactionAggregateData(conn?: PoolConnection) {
    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT
      COALESCE(SUM(CASE WHEN t.action = '${TxAction.TRANSACTION}' THEN t.fee END), 0) AS totalFeeTransaction,
      COALESCE(SUM(CASE WHEN t.action = '${TxAction.DEPOSIT}' THEN t.amount END), 0) AS totalAmountDeposit,
      COALESCE(SUM(CASE WHEN t.action = '${TxAction.TRANSACTION}' THEN t.amount END), 0) AS totalAmountTransaction,
      COALESCE(SUM(CASE WHEN t.action = '${TxAction.DEPOSIT}' THEN t.totalPrice END), 0) AS totalPriceDeposit,
      COALESCE(SUM(CASE WHEN t.action = '${TxAction.TRANSACTION}' THEN t.totalPrice END), 0) AS totalPriceTransaction,
      COALESCE(SUM(CASE WHEN t.action = '${TxAction.DEPOSIT}' THEN t.value END), 0) AS totalValueDeposit,
      COALESCE(SUM(CASE WHEN t.action = '${TxAction.TRANSACTION}' THEN t.value END), 0) AS totalValueTransaction
      FROM ${this.tableName} t
      WHERE t.wallet = '${this.wallet}'
      GROUP BY t.wallet;
      `,
      {},
      conn,
    );
    return data[0];
  }

  public async updateValueByHash(value: number, conn?: PoolConnection) {
    await this.getContext().mysql.paramExecute(
      `UPDATE ${this.tableName} SET value = @value
      WHERE hash = @hash
      AND chain = @chain
      AND chainType = @chainType;`,
      { value, hash: this.hash, chainType: this.chainType, chain: this.chain },
      conn,
    );
  }
}
