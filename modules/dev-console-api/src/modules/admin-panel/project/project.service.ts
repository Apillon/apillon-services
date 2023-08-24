import { HttpStatus, Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../../context';
import { Project } from '../../project/models/project.model';
import {
  BaseQueryFilter,
  CodeException,
  CreateQuotaOverrideDto,
  QuotaOverrideDto,
  Scs,
  StorageMicroservice,
  NftsMicroservice,
  QuotaDto,
  ApiKeyQueryFilterDto,
  Ams,
} from '@apillon/lib';
import { ResourceNotFoundErrorCode } from '../../../config/types';
import { UUID } from 'crypto';
import { ApiKey } from '@apillon/access/src/modules/api-key/models/api-key.model';
import { Lmas } from '@apillon/lib';
import { GetQuotaDto } from '@apillon/lib';

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
  ): Promise<
    Project & {
      totalBucketSize: number;
      numOfWebsites: number;
      numOfBuckets: number;
      numOfCollections: number;
    }
  > {
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
    const { data: projectStorageDetails } = await new StorageMicroservice(
      context,
    ).getProjectStorageDetails(project_uuid);

    const { data: projectCollectionDetails } = await new NftsMicroservice(
      context,
    ).getProjectCollectionDetails(project_uuid);

    return {
      ...project,
      ...projectStorageDetails,
      ...projectCollectionDetails,
    };
  }

  /**
   * Retreives a list of all quotas for a project
   * @async
   * @param {DevConsoleApiContext} context
   * @param {GetQuotaDto} query
   * @returns {Promise<QuotaDto[]>}
   */
  async getProjectQuotas(
    context: DevConsoleApiContext,
    query: GetQuotaDto,
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

  /**
   * Get a list of all API keys for a project, along with their usage counts
   * @param {DevConsoleApiContext} context
   * @param {ApiKeyQueryFilterDto} query - API key query filter
   */
  async getProjectApiKeys(
    context: DevConsoleApiContext,
    query: ApiKeyQueryFilterDto,
  ) {
    const { data }: { data: { items: ApiKey[]; total: number } } =
      await new Ams(context).listApiKeys(query);

    const { data: usageCounts } = await new Lmas().getApiKeysUsageCount(
      data.items.map((i) => i.apiKey),
    );

    data.items.forEach(
      (key: any) => (key.usageCount = usageCounts[key.apiKey]),
    );
    return data;
  }
}
