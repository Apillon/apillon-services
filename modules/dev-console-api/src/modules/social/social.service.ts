import {
  AttachedServiceType,
  BaseProjectQueryFilter,
  CodeException,
  CreatePostDto,
  CreateSpaceDto,
  SocialMicroservice,
  SocialPostQueryFilter,
} from '@apillon/lib';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ResourceNotFoundErrorCode } from '../../config/types';
import { DevConsoleApiContext } from '../../context';
import { Project } from '../project/models/project.model';
import { ServiceDto } from '../services/dtos/service.dto';
import { ServiceQueryFilter } from '../services/dtos/services-query-filter.dto';
import { Service } from '../services/models/service.model';
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
    const project = await new Project({}, context).populateByUUIDOrThrow(
      body.project_uuid,
    );

    // Check if social service for this project already exists
    const { total } = await new Service({}).getServices(
      context,
      new ServiceQueryFilter(
        {
          project_uuid: project.project_uuid,
          serviceType_id: AttachedServiceType.SOCIAL,
        },
        context,
      ),
    );
    if (total == 0) {
      // Create social service - "Attach"
      const computingService = new ServiceDto(
        {
          project_uuid: project.project_uuid,
          name: 'Social service',
          serviceType_id: AttachedServiceType.SOCIAL,
        },
        context,
      );
      await this.serviceService.createService(context, computingService);
    }

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
