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
import { DbTables } from '../../config/types';

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
    ],
    defaultValue: 0,
  })
  public totalClaimed: number;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.PROFILE],
    serializable: [SerializeFor.PROFILE],
    getter() {
      return this.status === SqlModelStatus.BLOCKED;
    },
  })
  public blocked: boolean;

  public override exists(): boolean {
    return !!this.user_uuid;
  }

  /**
   * Populates a TokenClaim model instance based on IP address and fingerprint.
   * @param conn Optional database connection to use for the query.
   * @returns The populated model instance or a reset instance if no match is found.
   */
  public async populateByIpAndFingerprint(
    conn?: PoolConnection,
  ): Promise<TokenClaim> {
    if (!this.ip_address && !this.fingerprint) {
      throw new Error('IP address or fingerprint must be provided.');
    }
    const data = await this.db().paramExecute(
      `
        SELECT * FROM \`${DbTables.TOKEN_CLAIM}\`
        WHERE (@ip_address IS NULL OR ip_address = @ip_address)
        AND (@fingerprint IS NULL OR fingerprint = @fingerprint)
      `,
      {
        ip_address: this.ip_address,
        fingerprint: this.fingerprint,
      },
      conn,
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }
}
