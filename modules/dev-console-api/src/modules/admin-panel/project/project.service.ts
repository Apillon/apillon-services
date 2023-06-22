import { HttpStatus, Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../../context';
import { Project } from '../../project/models/project.model';
import { CodeException } from '@apillon/lib';
import { ResourceNotFoundErrorCode } from '../../../config/types';
import { ProjectQueryFilter } from './dtos/project-query-filter.dto';

@Injectable()
export class ProjectService {
  /**
   * Retrieves a list of all users
   * @param {DevConsoleApiContext} context - The API context with current user session.
   * @returns {Promise<any>} The serialized user data.
   */
  async getProjectList(
    context: DevConsoleApiContext,
    filter: ProjectQueryFilter,
  ): Promise<any> {
    return await new Project({}, context).listAllProjects(context, filter);
  }

  /**
   * Retreive a project by its uuid
   * @async
   * @param {DevConsoleApiContext} context - - The API context with current user session.
   * @param {string} project_uuid - The project's uuid
   * @returns {Promise<Project>}
   */
  async getProject(
    context: DevConsoleApiContext,
    project_uuid: string,
  ): Promise<Project> {
    const project: Project = await new Project({}, context).getProjectDetail(
      project_uuid,
    );
    if (!project?.id) {
      throw new CodeException({
        status: HttpStatus.NOT_FOUND,
        code: ResourceNotFoundErrorCode.PROJECT_DOES_NOT_EXISTS,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    return project;
  }
}
