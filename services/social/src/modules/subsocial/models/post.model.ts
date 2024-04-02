import {
  ApiName,
  BaseProjectQueryFilter,
  Context,
  ErrorCode,
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
} from '@apillon/lib';
import { DbTables, PostType, SocialErrorCode } from '../../../config/types';

import { integerParser, stringParser } from '@rawmodel/parsers';
import { v4 as uuidV4 } from 'uuid';
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
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: SocialErrorCode.POST_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
    fakeValue: uuidV4(),
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
      SerializeFor.SERVICE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: SocialErrorCode.POST_REQUIRED_DATA_NOT_PRESENT,
      },
    ],
    fakeValue: PostType.REGULAR,
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
    fakeValue: 'Fake post',
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
    fakeValue: 'Fake post body',
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
    ],
  })
  public postId: string;

  /**
   * Renamed properties for apillon api ----------------------------------------
   */

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.APILLON_API],
    getter() {
      return this.post_uuid;
    },
  })
  public channel_uuid: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.APILLON_API],
    getter() {
      return this.postId;
    },
  })
  public channelId: string;

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

  public async getList(space_uuid: string, filter: BaseProjectQueryFilter) {
    this.canAccess(this.getContext());

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
        SELECT
        post_uuid as ${this.getContext().apiName == ApiName.APILLON_API ? 'channel_uuid' : 'post_uuid'},
        postId as ${this.getContext().apiName == ApiName.APILLON_API ? 'channelId' : 'postId'},
        ${selectFields},
        s.name as hubName,
        s.spaceId as hubId
        `,
      qFrom: `
        FROM \`${DbTables.POST}\` p
        JOIN \`${DbTables.SPACE}\` s ON s.id = p.space_id
        WHERE p.project_uuid = @project_uuid
        ${space_uuid ? ' AND s.space_uuid = @space_uuid' : ''}
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
    await this.validateOrThrow(SocialValidationException);

    const conn = await context.mysql.start();
    try {
      await this.insert(SerializeFor.INSERT_DB, conn);

      const provider = new SubsocialProvider(context, SubstrateChain.SUBSOCIAL);
      await provider.initializeApi();
      await provider.createPost(this);

      await context.mysql.commit(conn);

      await new Lmas().writeLog({
        context,
        project_uuid: this.project_uuid,
        location: 'Post.createPost',
        message: 'New social post(channel) created',
        service: ServiceName.SOCIAL,
        data: this.serialize(),
      });
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
