import { ApiKey } from '@apillon/access/src/modules/api-key/models/api-key.model';
import {
  AddCreditDto,
  Ams,
  ApiKeyQueryFilterDto,
  BaseQueryFilter,
  CodeException,
  CreateQuotaOverrideDto,
  GetQuotaDto,
  Lmas,
  NftsMicroservice,
  QuotaDto,
  QuotaOverrideDto,
  Scs,
  SerializeFor,
  StorageMicroservice,
  ModelValidationException,
  ContractsMicroservice,
} from '@apillon/lib';
import { HttpStatus, Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { v4 as uuidV4 } from 'uuid';
import {
  ResourceNotFoundErrorCode,
  ValidatorErrorCode,
} from '../../../config/types';
import { DevConsoleApiContext } from '../../../context';
import { Project } from '../../project/models/project.model';
import { ProjectsQueryFilter } from './dtos/projects-query-filter.dto';
import { ProjectUser } from '../../project/models/project-user.model';

@Injectable()
export class ProjectService {
  /**
   * Retrieves a list of all projects
   * @param {DevConsoleApiContext} context - The API context with current user session.
   * @param filter
   * @returns {Promise<any>} The serialized user data.
   */
  async getProjectList(
    context: DevConsoleApiContext,
    filter: ProjectsQueryFilter,
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
  ): Promise<any> {
    const project = await new Project({}, context).populateByUUIDOrThrow(
      project_uuid,
    );

    const { items: projectUsers } = await new ProjectUser(
      {},
      context,
    ).getProjectUsers(
      context,
      project_uuid,
      new BaseQueryFilter({ limit: 1000 }),
    );

    const { data: projectStorageDetails } = await new StorageMicroservice(
      context,
    ).getProjectStorageDetails(project_uuid);

    const { data: projectCollectionDetails } = await new NftsMicroservice(
      context,
    ).getProjectCollectionDetails(project_uuid);

    // const { data: projectContractsDetails } = await new ContractsMicroservice(
    //   context,
    // ).getProjectDeployedContractsDetails(project_uuid);

    const { data: projectCredit } = await new Scs(context).getProjectCredit(
      project_uuid,
    );

    return {
      ...project.serialize(SerializeFor.ADMIN),
      projectUsers,
      ...projectStorageDetails,
      ...projectCollectionDetails,
      // ...projectContractsDetails,
      creditBalance: projectCredit.balance,
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
   * @param {CreateQuotaOverrideDto} data - Create data
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
   * @param {QuotaOverrideDto} data - Create or Update data
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

  async addCreditsToProject(context: DevConsoleApiContext, data: AddCreditDto) {
    data.referenceTable = 'manually_added';
    data.referenceId = uuidV4();
    await data.validateOrThrow(ModelValidationException, ValidatorErrorCode);

    return (await new Scs(context).addCredit(data)).data;
  }
}
