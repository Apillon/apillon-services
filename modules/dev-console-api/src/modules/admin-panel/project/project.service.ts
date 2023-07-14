import { HttpStatus, Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../../context';
import { Project } from '../../project/models/project.model';
import {
  BaseQueryFilter,
  CodeException,
  CreateQuotaOverrideDto,
  QuotaOverrideDto,
  GetQuotasDto,
  Scs,
} from '@apillon/lib';
import { ResourceNotFoundErrorCode } from '../../../config/types';
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
    filter: BaseQueryFilter,
  ): Promise<any> {
    return await new Project({}, context).listProjects(context, filter);
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
    const project: Project = await new Project({}, context).populateByUUID(
      project_uuid,
    );
    if (!project?.exists()) {
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
   * @param {GetQuotasDto} query
   * @returns {Promise<QuotaDto[]>}
   */
  async getProjectQuotas(
    context: DevConsoleApiContext,
    query: GetQuotasDto,
  ): Promise<QuotaDto[]> {
    return await new Scs(context).getQuotas(query);
  }

  /**
   * Creates or updates a project quota by project_uuid and quota_id
   * @param {DevConsoleApiContext} context
   * @param {CreateQuotaOverrideDto} dto - Create or Update data
   */
  async createProjectQuota(
    context: DevConsoleApiContext,
    data: CreateQuotaOverrideDto,
  ) {
    return (await new Scs(context).createOverride(data)).data;
  }

  /**
   * Deletes project quota by project_uuid and quota_id
   * @param {DevConsoleApiContext} context
   * @param {QuotaOverrideDto} dto - Create or Update data
   */
  async deleteProjectQuota(
    context: DevConsoleApiContext,
    data: QuotaOverrideDto,
  ) {
    return await new Scs(context).deleteOverride(data);
  }
}
