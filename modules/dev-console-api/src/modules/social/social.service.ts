import {
  AttachedServiceType,
  BaseProjectQueryFilter,
  CodeException,
  CreateSpaceDto,
  SocialMicroservice,
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
    //check project
    const project: Project = await new Project({}, context).populateByUUID(
      body.project_uuid,
    );
    if (!project.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.PROJECT_DOES_NOT_EXISTS,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    project.canModify(context);

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
}
