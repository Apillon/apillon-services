import {
  BaseProjectQueryFilter,
  BaseQueryFilter,
  CreatePostDto,
  CreateSpaceDto,
  ProductCode,
  ServiceName,
  SpendCreditDto,
  SqlModelStatus,
  spendCreditAction,
} from '@apillon/lib';
import { ServiceContext, getSerializationStrategy } from '@apillon/service-lib';
import { v4 as uuidV4 } from 'uuid';
import { DbTables, PostType, SocialErrorCode } from '../../config/types';
import { Post } from './models/post.model';
import { Space } from './models/space.model';
import { SocialCodeException } from '../../lib/exceptions';

export class SubsocialService {
  static async listSpaces(
    event: { query: BaseProjectQueryFilter },
    context: ServiceContext,
  ) {
    return await new Space(
      { project_uuid: event.query.project_uuid },
      context,
    ).getList(new BaseProjectQueryFilter(event.query, context));
  }

  static async getSpace(
    event: { space_uuid: string },
    context: ServiceContext,
  ) {
    const space = await new Space({}, context).populateByUuidAndCheckAccess(
      event.space_uuid,
    );

    return space.serialize(getSerializationStrategy(context));
  }

  static async createSpace(
    params: { body: CreateSpaceDto },
    context: ServiceContext,
  ) {
    const space = new Space(
      { ...params.body, space_uuid: uuidV4(), status: SqlModelStatus.DRAFT },
      context,
    );

    const spendCredit: SpendCreditDto = new SpendCreditDto(
      {
        project_uuid: space.project_uuid,
        product_id: ProductCode.SOCIAL_SPACE,
        referenceTable: DbTables.SPACE,
        referenceId: space.space_uuid,
        location: 'SubsocialService.createSpace',
        service: ServiceName.SOCIAL,
      },
      context,
    );

    await spendCreditAction(context, spendCredit, () => space.createSpace());

    return space.serialize(getSerializationStrategy(context));
  }

  static async listPosts(
    event: { space_uuid: string; query: BaseQueryFilter },
    context: ServiceContext,
  ) {
    return await new Post({}, context).getList(
      event.space_uuid,
      new BaseQueryFilter(event.query),
    );
  }

  static async getPost(event: { post_uuid: string }, context: ServiceContext) {
    const post = await new Post({}, context).populateByUuidAndCheckAccess(
      event.post_uuid,
    );

    return post.serialize(getSerializationStrategy(context));
  }

  static async createPost(
    params: { body: CreatePostDto },
    context: ServiceContext,
  ) {
    const space = await new Space({}, context).populateByUuidAndCheckAccess(
      params.body.space_uuid,
    );

    if (!space.spaceId || space.status != SqlModelStatus.ACTIVE) {
      throw new SocialCodeException({
        status: 500,
        code: SocialErrorCode.SPACE_IS_NOT_ACTIVE,
      });
    }

    const post = new Post(
      {
        ...params.body,
        postType: PostType.REGULAR,
        post_uuid: uuidV4(),
        space_id: space.id,
        project_uuid: space.project_uuid,
        status: SqlModelStatus.DRAFT,
      },
      context,
    );

    const spendCredit: SpendCreditDto = new SpendCreditDto(
      {
        project_uuid: space.project_uuid,
        product_id: ProductCode.SOCIAL_POST,
        referenceTable: DbTables.POST,
        referenceId: post.post_uuid,
        location: 'SubsocialService.createPost',
        service: ServiceName.SOCIAL,
      },
      context,
    );

    await spendCreditAction(context, spendCredit, () => post.createPost());

    return post.serialize(getSerializationStrategy(context));
  }
}
