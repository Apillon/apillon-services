import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';
import {
  BaseProjectQueryFilter,
  BaseQueryFilter,
  CreatePostDto,
  CreateSpaceDto,
  SocialMicroservice,
} from '@apillon/lib';

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

  async listPosts(
    context: ApillonApiContext,
    space_uuid: string,
    query: BaseQueryFilter,
  ) {
    return (await new SocialMicroservice(context).listPosts(space_uuid, query))
      .data;
  }

  async getPost(context: ApillonApiContext, post_uuid: string) {
    return (await new SocialMicroservice(context).getPost(post_uuid)).data;
  }

  async createPost(context: ApillonApiContext, body: CreatePostDto) {
    return (await new SocialMicroservice(context).createPost(body)).data;
  }
}
