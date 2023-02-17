import {
  AdvancedSQLModel,
  Context,
  PopulateFrom,
  presenceValidator,
  prop,
  SerializeFor,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  DbTables,
  NftsErrorCode,
  TransactionStatus,
} from '../../../config/types';
import {
  NftsCodeException,
  NftsValidationException,
} from '../../../lib/exceptions';

export class Transaction extends AdvancedSQLModel {
  public readonly tableName = DbTables.TRANSACTION;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: NftsErrorCode.TRANSACTION_CHAIN_ID_NOT_PRESENT,
      },
    ],
  })
  public chainId: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: NftsErrorCode.TRANSACTION_TYPE_NOT_PRESENT,
      },
    ],
  })
  public transactionType: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: NftsErrorCode.TRANSACTION_RAW_TRANSACTION_NOT_PRESENT,
      },
    ],
  })
  public rawTransaction: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: NftsErrorCode.TRANSACTION_NONCE_NOT_PRESENT,
      },
    ],
  })
  public nonce: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [],
  })
  public refTable: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
  })
  public refId: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    defaultValue: TransactionStatus.REQUESTED,
  })
  public transactionStatus: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.DB,
      PopulateFrom.SERVICE,
      PopulateFrom.ADMIN,
      PopulateFrom.PROFILE,
    ],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.PROFILE,
    ],
    validators: [],
  })
  public transactionHash: string;

  /**
   * Model method, to insert new transaction record to DB
   * Note: See that FOR UPDATE is used, to awoid problems with multiple same nonces
   */
  public async createTransaction() {
    const conn = await this.getContext().mysql.start();
    try {
      //Get current max nonce
      const data = await this.getContext().mysql.paramExecute(
        `
        SELECT MAX(nonce) as nonce
        FROM \`${this.tableName}\`
        FOR UPDATE;
        `,
        {},
        conn,
      );
      this.nonce = data && data.length ? data[0].nonce + 1 : 1;

      //Validate model
      try {
        await this.validate();
      } catch (err) {
        await this.handle(err);
        if (!this.isValid()) throw new NftsValidationException(this);
      }

      //insert new transaction
      await this.insert(SerializeFor.INSERT_DB, conn);
      await this.getContext().mysql.commit(conn);
    } catch (err) {
      await this.getContext().mysql.rollback(conn);

      throw await new NftsCodeException({
        status: 500,
        code: NftsErrorCode.CREATE_NEW_TRANSACTION_ERROR,
        context: this.getContext(),
        sourceFunction: 'createTransaction()',
        errorMessage: 'Error creating new transaction',
        details: err,
      }).writeToMonitor({});
    }
  }
}
