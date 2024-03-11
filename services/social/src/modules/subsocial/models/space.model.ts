import {
  ApiName,
  BaseProjectQueryFilter,
  Context,
  ErrorCode,
  LogType,
  Lmas,
  PopulateFrom,
  SerializeFor,
  ServiceName,
  SqlModelStatus,
  SubstrateChain,
  UuidSqlModel,
  getQueryParams,
  presenceValidator,
  prop,
  selectAndCountQuery,
  BlockchainMicroservice,
} from '@apillon/lib';
import { DbTables, SocialErrorCode } from '../../../config/types';

import { stringParser, integerParser } from '@rawmodel/parsers';
import {
  SocialCodeException,
  SocialValidationException,
} from '../../../lib/exceptions';
import { SubsocialProvider } from '../subsocial.provider';
import { v4 as uuidV4 } from 'uuid';

export class Space extends UuidSqlModel {
  public readonly tableName = DbTables.SPACE;

  public constructor(data: any, context: Context) {
    super(data, context);
  }

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: SocialErrorCode.SPACE_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
    fakeValue: uuidV4(),
  })
  public space_uuid: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SERVICE,
      SerializeFor.LOGGER,
      SerializeFor.PROFILE,
      SerializeFor.APILLON_API,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ErrorCode.STATUS_NOT_PRESENT,
      },
    ],
    defaultValue: SqlModelStatus.ACTIVE,
    fakeValue() {
      return SqlModelStatus.ACTIVE;
    },
  })
  public status?: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: SocialErrorCode.SPACE_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public project_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: SocialErrorCode.SPACE_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
    fakeValue: 'Test space',
  })
  public name: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.SELECT_DB,
    ],
  })
  public about: string;

  /*@prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.SELECT_DB,
    ],
  })
  public image: string;*/

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.SELECT_DB,
    ],
  })
  public tags: string;

  /**spaceId recieved when space is created on chain */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.PROFILE,
      SerializeFor.SERVICE,
      SerializeFor.APILLON_API,
      SerializeFor.SELECT_DB,
    ],
  })
  public spaceId: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
    ],
  })
  public walletAddress: string;

  public async populateByUuidAndCheckAccess(uuid: string): Promise<this> {
    const space: Space = await this.populateByUUID(uuid, 'space_uuid');

    if (!space.exists()) {
      throw new SocialCodeException({
        code: SocialErrorCode.SPACE_NOT_FOUND,
        status: 404,
      });
    }
    space.canAccess(this.getContext());

    return this;
  }

  public async getList(filter: BaseProjectQueryFilter) {
    this.canAccess(this.getContext());

    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      's',
      {
        id: 's.id',
      },
      filter.serialize(),
    );

    const selectFields = this.generateSelectFields(
      's',
      '',
      this.getContext().apiName == ApiName.ADMIN_CONSOLE_API
        ? SerializeFor.ADMIN_SELECT_DB
        : SerializeFor.SELECT_DB,
    );
    const sqlQuery = {
      qSelect: `
        SELECT ${selectFields},
        (
          SELECT COUNT(*)
          FROM \`${DbTables.POST}\` p
          WHERE p.space_id = s.id
        ) as numOfPosts
        `,
      qFrom: `
        FROM \`${DbTables.SPACE}\` s
        WHERE s.project_uuid = IFNULL(@project_uuid, s.project_uuid)
        AND (@search IS null OR s.name LIKE CONCAT('%', @search, '%') OR s.space_uuid = @search)
        AND ((@status IS null AND s.status <> ${SqlModelStatus.DELETED}) OR @status = s.status)
      `,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    return await selectAndCountQuery(
      this.getContext().mysql,
      sqlQuery,
      params,
      's.id',
    );
  }

  public async createSpace() {
    const context = this.getContext();
    try {
      await this.validate();
    } catch (err) {
      await this.handle(err);
      if (!this.isValid()) {
        throw new SocialValidationException(this);
      }
    }

    //Get subsocial wallets, and pick least used
    const wallets = await new BlockchainMicroservice(context).getWallets(
      SubstrateChain.SUBSOCIAL,
    );

    console.info('Retrieving wallet address used to create space');

    const queries = [];
    for (const wallet of wallets.data.map((x) => x.address)) {
      queries.push(`
        select "${wallet}" as walletAddress, 
        (
          SELECT count(*) from \`${DbTables.SPACE}\` 
          where walletAddress = "${wallet}"
        ) as numOfSpaces
      `);
    }
    const numOfSpacesByWallet = await context.mysql.paramExecute(
      `
      SELECT t.* 
      FROM (${queries.join(' UNION ')})t 
      order by t.numOfSpaces
      limit 1
      `,
      {},
    );

    this.walletAddress = numOfSpacesByWallet[0].walletAddress;

    console.info(
      'Wallet retrieved! Creating space... ',
      numOfSpacesByWallet[0],
    );

    if (numOfSpacesByWallet[0].numOfSpaces > 4000) {
      throw await new SocialCodeException({
        code: SocialErrorCode.WALLETS_HAVE_REACHED_MAX_SPACES,
        status: 500,
        sourceFunction: 'createSpace',
        context,
        details: {
          leastUsedWallet: numOfSpacesByWallet[0],
        },
      }).writeToMonitor({ logType: LogType.ERROR, sendAdminAlert: true });
    }

    const conn = await context.mysql.start();
    try {
      await this.insert(SerializeFor.INSERT_DB, conn);
      const provider = new SubsocialProvider(context, SubstrateChain.SUBSOCIAL);
      await provider.initializeApi();
      await provider.createSpace(this);

      await context.mysql.commit(conn);

      await new Lmas().writeLog({
        context,
        project_uuid: this.project_uuid,
        location: 'Space.createSpace',
        message: 'New social space(hub) created',
        service: ServiceName.SOCIAL,
        data: this.serialize(),
      });
    } catch (err) {
      await context.mysql.rollback(conn);

      throw await new SocialCodeException({
        code: SocialErrorCode.ERROR_CREATING_SPACE,
        status: 500,
        sourceFunction: 'createSpace',
        context,
        details: {
          err,
          space: this.serialize(),
        },
      }).writeToMonitor({ logType: LogType.ERROR, sendAdminAlert: true });
    }
  }
}
