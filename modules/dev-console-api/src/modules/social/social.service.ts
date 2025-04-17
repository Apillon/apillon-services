import {
  AttachedServiceType,
  BaseProjectQueryFilter,
  CreatePostDto,
  CreateSpaceDto,
  SocialMicroservice,
  SocialPostQueryFilter,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { ServicesService } from '../services/services.service';

@Injectable()
export class SocialService {
  constructor(private readonly serviceService: ServicesService) {}

  async listSpaces(
    context: DevConsoleApiContext,
    query: BaseProjectQueryFilter,
  ) {
    return (await new SocialMicroservice(context).listSpaces(query)).data;
  }

  async getSpace(context: DevConsoleApiContext, space_uuid: string) {
    return (await new SocialMicroservice(context).getSpace(space_uuid)).data;
  }

  async createSpace(context: DevConsoleApiContext, body: CreateSpaceDto) {
    await this.serviceService.createServiceIfNotExists(
      context,
      body.project_uuid,
      AttachedServiceType.SOCIAL,
    );

    return (await new SocialMicroservice(context).createSpace(body)).data;
  }

  async archiveSpace(context: DevConsoleApiContext, space_uuid: string) {
    return (await new SocialMicroservice(context).archiveSpace(space_uuid))
      .data;
  }

  async activateSpace(context: DevConsoleApiContext, space_uuid: string) {
    return (await new SocialMicroservice(context).activateSpace(space_uuid))
      .data;
  }

  async listPosts(context: DevConsoleApiContext, query: SocialPostQueryFilter) {
    return (await new SocialMicroservice(context).listPosts(query)).data;
  }

  async getPost(context: DevConsoleApiContext, post_uuid: string) {
    return (await new SocialMicroservice(context).getPost(post_uuid)).data;
  }

  async createPost(context: DevConsoleApiContext, body: CreatePostDto) {
    return (await new SocialMicroservice(context).createPost(body)).data;
  }

  async archivePost(context: DevConsoleApiContext, post_uuid: string) {
    return (await new SocialMicroservice(context).archivePost(post_uuid)).data;
  }

  async activatePost(context: DevConsoleApiContext, post_uuid: string) {
    return (await new SocialMicroservice(context).activatePost(post_uuid)).data;
  }
}
