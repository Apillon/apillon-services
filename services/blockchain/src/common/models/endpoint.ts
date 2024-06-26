import { integerParser, stringParser } from '@rawmodel/parsers';
import {
  AdvancedSQLModel,
  ChainType,
  Context,
  PopulateFrom,
  prop,
  SerializeFor,
  SqlModelStatus,
  runCachedFunction,
  CacheKeyPrefix,
  CacheKeyTTL,
} from '@apillon/lib';
import { Chain, DbTables } from '../../config/types';

export class Endpoint extends AdvancedSQLModel {
  public readonly tableName = DbTables.ENDPOINT;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  /**
   * url
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
  public url: string;

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
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
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
      SerializeFor.SELECT_DB,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.PROFILE,
    ],
  })
  public chainType: ChainType;

  /**
   * priority
   */
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
  })
  public priority: number;

  public async populateByChain(
    chain: Chain,
    type: ChainType,
    priority: number = null,
  ): Promise<Endpoint> {
    if (!chain) {
      throw new Error('chain should not be null');
    }

    const data = await runCachedFunction(
      `${CacheKeyPrefix.BLOCKCHAIN_ENDPOINT}:${[chain, type, priority].join(
        ':',
      )}`,
      async () => {
        const data = await this.getContext().mysql.paramExecute(
          `
            SELECT *
            FROM \`${DbTables.ENDPOINT}\`
            WHERE
            chainType = @type
            AND chain = @chain
            AND status <> ${SqlModelStatus.DELETED}
            AND (@priority IS NULL OR @priority = priority)
            LIMIT 1;
          `,
          { chain, type, priority },
        );

        return data?.length
          ? this.populate(data[0], PopulateFrom.DB)
          : this.reset();
      },
      CacheKeyTTL.EXTRA_LONG,
    );
    return new Endpoint(data, this.getContext());
  }
}
