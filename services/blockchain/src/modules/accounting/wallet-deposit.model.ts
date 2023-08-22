import {
  AdvancedSQLModel,
  PopulateFrom,
  presenceValidator,
  prop,
  SerializeFor,
} from '@apillon/lib';
import { floatParser, integerParser, stringParser } from '@rawmodel/parsers';

import { BlockchainErrorCode, DbTables } from '../../config/types';
export class WalletDeposit extends AdvancedSQLModel {
  public readonly tableName = DbTables.WALLET_DEPOSIT;

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
        code: BlockchainErrorCode.WALLET_DEPOSIT_WALLET_NOT_PRESENT,
      },
    ],
  })
  public wallet_id: number;

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
        code: BlockchainErrorCode.WALLET_DEPOSIT_TX_HASH_NOT_PRESENT,
      },
    ],
  })
  public transactionHash: string;

  /**
   * Amount of tokens purchased (sent via deposit)
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
    validators: [
      {
        resolver: presenceValidator(),
        code: BlockchainErrorCode.WALLET_DEPOSIT_PURCHASE_AMOUNT_NOT_PRESENT,
      },
    ],
  })
  public depositAmount: number;

  /**
   * Amount of tokens left in current deposit
   */
  @prop({
    parser: { resolver: floatParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: BlockchainErrorCode.WALLET_DEPOSIT_PURCHASE_AMOUNT_NOT_PRESENT,
      },
    ],
  })
  public currentAmount: number;

  /**
   * Purchase price for a single token in fiat terms (at time of deposit)
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
  public pricePerToken: number;

  public async getOldestWithBalance(wallet_id: number) {
    const data = await this.getContext().mysql.paramExecute(
      `
      SELECT *
      FROM \`${this.tableName}\`
      WHERE wallet_id = @wallet_id
      AND currentAmount > 0
      ORDER BY createTime ASC
      LIMIT 1;
      `,
      { wallet_id },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }
}
