import { HttpStatus, Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../../context';
import { Project } from '../../project/models/project.model';
import { CodeException } from '@apillon/lib';
import { ResourceNotFoundErrorCode } from '../../../config/types';

@Injectable()
export class ProjectService {
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
    const project: Project = await new Project({}, context).populateByUUID(
      project_uuid,
    );
    if (!project.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.PROJECT_DOES_NOT_EXISTS,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    return project;
  }
}
