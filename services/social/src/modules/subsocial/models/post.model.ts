import {
  ApiName,
  BaseQueryFilter,
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
import { Space } from './space.model';
import {
  SocialCodeException,
  SocialValidationException,
} from '../../../lib/exceptions';
import { SubsocialProvider } from '../subsocial.provider';

export class Post extends UuidSqlModel {
  public readonly tableName = DbTables.POST;

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
        code: SocialErrorCode.POST_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public post_uuid: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: SocialErrorCode.POST_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public space_id: number;

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
        code: SocialErrorCode.POST_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public project_uuid: string;

  @prop({
    parser: { resolver: integerParser() },
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
        code: SocialErrorCode.POST_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public postType: number;

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
    validators: [
      {
        resolver: presenceValidator(),
        code: SocialErrorCode.POST_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public title: string;

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
    validators: [
      {
        resolver: presenceValidator(),
        code: SocialErrorCode.POST_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public body: string;

  /*@prop({
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
  public image: string;*/

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
  public tags: string;

  /**postId recieved when post is created on chain */
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
  public postId: string;

  public async populateByUuidAndCheckAccess(uuid: string): Promise<this> {
    const post: Post = await this.populateByUUID(uuid, 'post_uuid');

    if (!post.exists()) {
      throw new SocialCodeException({
        code: SocialErrorCode.POST_NOT_FOUND,
        status: 404,
      });
    }
    post.canAccess(this.getContext());

    return this;
  }

  public async getList(space_uuid: string, filter: BaseQueryFilter) {
    await new Space({}, this.getContext()).populateByUuidAndCheckAccess(
      space_uuid,
    );

    const { params, filters } = getQueryParams(
      filter.getDefaultValues(),
      'p',
      {
        id: 'p.id',
      },
      filter.serialize(),
    );

    const selectFields = this.generateSelectFields(
      'p',
      '',
      this.getContext().apiName == ApiName.ADMIN_CONSOLE_API
        ? SerializeFor.ADMIN_SELECT_DB
        : SerializeFor.SELECT_DB,
    );
    const sqlQuery = {
      qSelect: `
        SELECT ${selectFields}
        `,
      qFrom: `
        FROM \`${DbTables.POST}\` p
        JOIN \`${DbTables.SPACE}\` s ON s.id = p.space_id
        WHERE s.space_uuid = @space_uuid
        AND (@search IS null OR p.title LIKE CONCAT('%', @search, '%') OR p.post_uuid = @search)
        AND ((@status IS null AND s.status <> ${SqlModelStatus.DELETED}) OR @status = p.status)
      `,
      qFilter: `
        ORDER BY ${filters.orderStr}
        LIMIT ${filters.limit} OFFSET ${filters.offset};
      `,
    };

    return await selectAndCountQuery(
      this.getContext().mysql,
      sqlQuery,
      { ...params, space_uuid },
      'p.id',
    );
  }

  public async createPost() {
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
      await provider.createPost(this);

      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);

      throw await new SocialCodeException({
        code: SocialErrorCode.ERROR_CREATING_POST,
        status: 500,
        sourceFunction: 'createPost',
        context,
        details: {
          err,
          post: this.serialize(),
        },
      }).writeToMonitor({ sendAdminAlert: true });
    }
  }
}
