import { HttpStatus, Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../../context';
import { Project } from '../../project/models/project.model';
import { CodeException, GetAllQuotasDto, Scs } from '@apillon/lib';
import { ResourceNotFoundErrorCode } from '../../../config/types';
import { ProjectQueryFilter } from './dtos/project-query-filter.dto';
import { QuotaDto } from '@apillon/lib/dist/lib/at-services/config/dtos/quota.dto';
import { UUID } from 'crypto';

@Injectable()
export class ProjectService {
  /**
   * Retrieves a list of all projects
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
   * @param {UUID} project_uuid - The project's uuid
   * @returns {Promise<Project>}
   */
  async getProject(
    context: DevConsoleApiContext,
    project_uuid: UUID,
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

  /**
   * Retreives a list of all quotas for a project
   * @async
   * @param {DevConsoleApiContext} context
   * @param {GetAllQuotasDto} query
   * @returns {Promise<QuotaDto[]>}
   */
  async getProjectQuotas(
    context: DevConsoleApiContext,
    query: GetAllQuotasDto,
  ): Promise<QuotaDto[]> {
    return await new Scs(context).getAllQuotas(query);
  }
}
