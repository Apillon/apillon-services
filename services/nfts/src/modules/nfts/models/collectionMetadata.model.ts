import {
  Context,
  PoolConnection,
  PopulateFrom,
  presenceValidator,
  prop,
  SerializeFor,
  UuidSqlModel,
} from '@apillon/lib';
import { integerParser, stringParser } from '@rawmodel/parsers';
import { DbTables, NftsErrorCode } from '../../../config/types';
import { Metadata } from '@apillon/blockchain-lib/common';

export class CollectionMetadata extends UuidSqlModel {
  public readonly tableName = DbTables.COLLECTION_METADATA;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

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
      SerializeFor.APILLON_API,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: NftsErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public collection_id: number;

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
      SerializeFor.APILLON_API,
      SerializeFor.PROFILE,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: NftsErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public tokenId: number;

  @prop({
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
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: NftsErrorCode.DATA_NOT_PRESENT,
      },
    ],
  })
  public metadata: Metadata;

  async getNextTokens(
    collection_id: number,
    tokenCount: number = 1,
    conn?: PoolConnection,
  ): Promise<CollectionMetadata[]> {
    if (!collection_id) {
      throw new Error('collection_id should not be null');
    }
    const rows = await this.getContext().mysql.paramExecute(
      `
        SELECT *
        FROM \`${DbTables.COLLECTION_METADATA}\`
        WHERE
          collection_id = @collection_id AND
          minted = false
        ORDER BY tokenId
        LIMIT ${tokenCount}
          FOR
        UPDATE
        ;
      `,
      { collection_id },
      conn,
    );
    return rows.map((metadata) =>
      new CollectionMetadata({}, this.getContext()).populate(
        metadata,
        PopulateFrom.DB,
      ),
    );
  }

  async markTokensAsMinted(
    collection_id: number,
    tokenIds: number[],
    conn?: PoolConnection,
  ): Promise<void> {
    if (!collection_id) {
      throw new Error('collection_id should not be null');
    }
    if (tokenIds.length <= 0) {
      throw new Error('tokenIds should contain at least one token id');
    }
    const tokenIdsString = tokenIds
      .map((tokenId) => parseInt(`${tokenId}`))
      .join(',');
    await this.getContext().mysql.paramExecute(
      `
        UPDATE \`${DbTables.COLLECTION_METADATA}\`
        SET minted=true
        WHERE
          collection_id = @collection_id AND tokenId IN (${tokenIdsString})
        ;
      `,
      { collection_id },
      conn,
    );
  }

  public async batchInsert(
    collection_id: number,
    metadata: { [tokenId: string]: Metadata },
    conn?: PoolConnection,
  ): Promise<void> {
    if (!collection_id) {
      throw new Error('collection_id should not be null');
    }

    const rows = Object.keys(metadata).map(
      (tokenId) =>
        `(${collection_id}, ${parseInt(tokenId)}, '${escapeStringForSql(JSON.stringify(metadata[tokenId]))}')`,
    );

    await this.getContext().mysql.paramExecute(
      `
        INSERT INTO \`${DbTables.COLLECTION_METADATA}\` (collection_id, tokenId, metadata)
        VALUES ${rows.join(',')};
      `,
      { collection_id },
      conn,
    );
  }
}

function escapeStringForSql(jsonString: string) {
  return jsonString
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
