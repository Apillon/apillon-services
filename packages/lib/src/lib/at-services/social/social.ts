import { SocialPostQueryFilter, WalletIdentityDto } from '../../..';
import { env } from '../../../config/env';
import { AppEnvironment, SocialEventType } from '../../../config/types';
import { BaseProjectQueryFilter } from '../../base-models/base-project-query-filter.model';
import { BaseQueryFilter } from '../../base-models/base-query-filter.model';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { CreatePostDto } from './dtos/create-post.dto';
import { CreateSpaceDto } from './dtos/create-space.dto';

export class SocialMicroservice extends BaseService {
  lambdaFunctionName =
    env.APP_ENV === AppEnvironment.TEST
      ? env.SOCIAL_FUNCTION_NAME_TEST
      : env.SOCIAL_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.SOCIAL_SOCKET_PORT_TEST
      : env.SOCIAL_SOCKET_PORT;
  serviceName = 'SOCIAL';

  constructor(context: Context) {
    super(context);
    this.isDefaultAsync = false;
  }

  public async listSpaces(params: BaseProjectQueryFilter) {
    const data = {
      eventName: SocialEventType.LIST_SPACES,
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  public async getSpace(space_uuid: string) {
    const data = {
      eventName: SocialEventType.GET_SPACE,
      space_uuid,
    };
    return await this.callService(data);
  }

  public async createSpace(params: CreateSpaceDto) {
    const data = {
      eventName: SocialEventType.CREATE_SPACE,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async listPosts(params: SocialPostQueryFilter) {
    const data = {
      eventName: SocialEventType.LIST_POSTS,
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  public async getPost(post_uuid: string) {
    const data = {
      eventName: SocialEventType.GET_POST,
      post_uuid,
    };
    return await this.callService(data);
  }

  public async createPost(params: CreatePostDto) {
    const data = {
      eventName: SocialEventType.CREATE_POST,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  //#region wallet-identity
  public async getWalletIdentity(query: WalletIdentityDto) {
    return await this.callService({
      eventName: SocialEventType.GET_WALLET_IDENTITY,
      query,
    });
  }
  //#endregion

  public async getProjectSocialDetails(
    project_uuid: string,
  ): Promise<{ data: { spaceCount: number; postCount: number } }> {
    return await this.callService({
      eventName: SocialEventType.PROJECT_SOCIAL_DETAILS,
      project_uuid,
    });
  }
}
