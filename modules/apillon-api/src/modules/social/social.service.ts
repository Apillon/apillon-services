import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';
import {
  BaseProjectQueryFilter,
  CreatePostDto,
  CreateSpaceDto,
  SocialMicroservice,
  SocialPostQueryFilter,
} from '@apillon/lib';

/** @deprecated This service is deprecated and should not be used. */
@Injectable()
export class SocialService {
  async listSpaces(context: ApillonApiContext, query: BaseProjectQueryFilter) {
    return (await new SocialMicroservice(context).listSpaces(query)).data;
  }

  async getSpace(context: ApillonApiContext, space_uuid: string) {
    return (await new SocialMicroservice(context).getSpace(space_uuid)).data;
  }

  async createSpace(context: ApillonApiContext, body: CreateSpaceDto) {
    return (await new SocialMicroservice(context).createSpace(body)).data;
  }

  async listPosts(context: ApillonApiContext, query: SocialPostQueryFilter) {
    return (await new SocialMicroservice(context).listPosts(query)).data;
  }

  async getPost(context: ApillonApiContext, post_uuid: string) {
    return (await new SocialMicroservice(context).getPost(post_uuid)).data;
  }

  async createPost(context: ApillonApiContext, body: CreatePostDto) {
    return (await new SocialMicroservice(context).createPost(body)).data;
  }
}
