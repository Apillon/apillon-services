import {
  ApiName,
  BaseProjectQueryFilter,
  Context,
  ErrorCode,
  PopulateFrom,
  SerializeFor,
  SqlModelStatus,
  SubstrateChain,
  UuidSqlModel,
  getQueryParams,
  presenceValidator,
  prop,
  selectAndCountQuery,
} from '@apillon/lib';
import { DbTables, SocialErrorCode } from '../../../config/types';

import { stringParser, integerParser } from '@rawmodel/parsers';
import {
  SocialCodeException,
  SocialValidationException,
} from '../../../lib/exceptions';
import { SubsocialProvider } from '../subsocial.provider';

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

    const conn = await context.mysql.start();
    try {
      await this.insert(SerializeFor.INSERT_DB, conn);

      const provider = new SubsocialProvider(context, SubstrateChain.XSOCIAL);
      await provider.initializeApi();
      await provider.createSpace(this);

      await context.mysql.commit(conn);
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
      }).writeToMonitor({ sendAdminAlert: true });
    }
  }
}
