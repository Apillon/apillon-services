import { ChainType, Context, PoolConnection } from '@apillon/lib';
import { DbTables } from '../../config/types';

export class TransactionLogService {
  private chain: number;
  private chainType: ChainType;

  constructor(chain: number, chainType: ChainType) {
    this.chain = chain;
    this.chainType = chainType;
  }

  public async getLastLoggedBlockNumber(
    context: Context,
    wallet: string,
    conn?: PoolConnection,
  ) {
    const res = await context.mysql.paramExecute(
      `
      SELECT MAX(blockId) as maxBlockId
      FROM \`${DbTables.TRANSACTION_LOG}\`
      WHERE chain = @chain
      AND wallet = @wallet
    `,
      { wallet, chain: this.chain },
      conn,
    );

    return res.length ? res[0].maxBlockId : 0;
  }
}
