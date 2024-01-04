import {
  BaseProjectQueryFilter,
  BaseQueryFilter,
  CreatePostDto,
  CreateSpaceDto,
  SerializeFor,
  SqlModelStatus,
  SubstrateChain,
} from '@apillon/lib';
import { ServiceContext, getSerializationStrategy } from '@apillon/service-lib';
import { v4 as uuidV4 } from 'uuid';
import {
  SocialCodeException,
  SocialValidationException,
} from '../../lib/exceptions';
import { Space } from './models/space.model';
import { SubsocialProvider } from './subsocial.provider';
import { Post } from './models/post.model';
import { PostType, SocialErrorCode } from '../../config/types';

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
    //TODO spend credit action

    try {
      await space.validate();
    } catch (err) {
      await space.handle(err);
      if (!space.isValid()) {
        throw new SocialValidationException(space);
      }
    }

    const conn = await context.mysql.start();
    try {
      await space.insert(SerializeFor.INSERT_DB, conn);

      const provider = new SubsocialProvider(context, SubstrateChain.XSOCIAL);
      await provider.initializeApi();
      await provider.createSpace(space);

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
          space: space.serialize(),
        },
      }).writeToMonitor({ sendAdminAlert: true });
    }

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
    //TODO spend credit action

    try {
      await post.validate();
    } catch (err) {
      await post.handle(err);
      if (!post.isValid()) {
        throw new SocialValidationException(post);
      }
    }

    const conn = await context.mysql.start();
    try {
      await post.insert(SerializeFor.INSERT_DB, conn);

      const provider = new SubsocialProvider(context, SubstrateChain.XSOCIAL);
      await provider.initializeApi();
      await provider.createPost(post);

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
          post: post.serialize(),
        },
      }).writeToMonitor({ sendAdminAlert: true });
    }

    return post.serialize(getSerializationStrategy(context));
  }
}
