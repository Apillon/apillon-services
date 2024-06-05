import { booleanParser, integerParser, stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  getFaker,
  PoolConnection,
  PopulateFrom,
  prop,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { DbTables } from '../../../config/types';
import { v4 as uuidV4 } from 'uuid';

export class TokenClaim extends AdvancedSQLModel {
  public readonly tableName = DbTables.TOKEN_CLAIM;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
    ],
    fakeValue: () => uuidV4(),
  })
  public user_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
    ],
  })
  public wallet: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
    ],
    fakeValue: () => getFaker().internet.ip(),
  })
  public ip_address: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
    ],
    fakeValue: () => getFaker().random.word(),
  })
  public fingerprint: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: 0,
    fakeValue: 50,
  })
  public totalNctr: number;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
    fakeValue: false,
  })
  public claimCompleted: boolean;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SELECT_DB,
      SerializeFor.INSERT_DB,
      SerializeFor.PROFILE,
    ],
  })
  public transactionHash: string;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [SerializeFor.ADMIN],
    getter() {
      return this.status === SqlModelStatus.BLOCKED;
    },
  })
  public blocked: boolean;

  public override exists(): boolean {
    return !!this.user_uuid;
  }

  /**
   * Populates a TokenClaim model instance based on fingerprint.
   * @param conn Optional database connection to use for the query.
   * @returns The populated model instance or a reset instance if no match is found.
   */
  public async findAllByFingerprint(
    conn?: PoolConnection,
  ): Promise<TokenClaim[]> {
    if (!this.fingerprint) {
      throw new Error('fingerprint must be provided.');
    }
    const data = await this.db().paramExecute(
      `
        SELECT user_uuid FROM \`${DbTables.TOKEN_CLAIM}\`
        WHERE fingerprint = @fingerprint
      `,
      { fingerprint: this.fingerprint },
      conn,
    );

    return data.map((d) =>
      new TokenClaim({}, this.getContext()).populate(d, PopulateFrom.DB),
    );
  }

  /**
   * Marks token claim user as blocked
   */
  public async markBlocked(conn?: PoolConnection): Promise<this> {
    await this.getContext().mysql.paramExecute(
      `
      UPDATE ${DbTables.TOKEN_CLAIM}
      SET status = ${SqlModelStatus.BLOCKED}
      WHERE user_uuid = @user_uuid
      `,
      { user_uuid: this.user_uuid },
      conn,
    );
    return this;
  }
}
