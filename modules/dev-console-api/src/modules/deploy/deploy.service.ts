import {
  Ams,
  ApiKeyRoleBaseDto,
  AttachedServiceType,
  CreateApiKeyDto,
  CreateDeploymentConfigDto,
  CreateWebsiteDto,
  DefaultApiKeyRole,
  DeployMicroservice,
  DeploymentBuildQueryFilter,
  GithubLinkDto,
  GithubUnlinkDto,
  Lmas,
  LogType,
  NftWebsiteDeployDto,
  NftsMicroservice,
  ServiceName,
  SetEnvironmentVariablesDto,
  StorageMicroservice,
  UpdateDeploymentConfigDto,
  WebsiteSource,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { GitHubWebhookPayload } from '../../config/types';
import { DeployNftWebsiteDto } from './dtos/deploy-nft-website.dto';
import { ServicesService } from '../services/services.service';
import { ServiceQueryFilter } from '../services/dtos/services-query-filter.dto';

@Injectable()
export class DeployService {
  constructor(private readonly servicesService: ServicesService) {}

  private async createAndPopulateApiKeyForDeploy(
    body: CreateDeploymentConfigDto | DeployNftWebsiteDto,
    context: DevConsoleApiContext,
  ) {
    const accessMS = new Ams(context);
    await this.servicesService.createServiceIfNotExists(
      context,
      body.projectUuid,
      AttachedServiceType.HOSTING,
    );

    const serviceList = await this.servicesService.getServiceList(
      context,
      new ServiceQueryFilter({}, context).populate({
        project_uuid: body.projectUuid,
        serviceType_id: AttachedServiceType.HOSTING,
      }),
    );

    const createdApiKey = await accessMS.createApiKey(
      new CreateApiKeyDto({}, context).populate({
        project_uuid: body.projectUuid,
        name: `Deployment API Key - ${body['websiteUuid'] ?? body['collectionUuid']}`,
        testNetwork: false,
        roles: [
          new ApiKeyRoleBaseDto({}, context).populate({
            role_id: DefaultApiKeyRole.KEY_EXECUTE,
            project_uuid: body.projectUuid,
            service_uuid: serviceList.items[0].service_uuid,
            serviceType_id: AttachedServiceType.HOSTING,
          }),
        ],
      }),
    );

    body.apiKey = createdApiKey.data.apiKey;
    body.apiSecret = createdApiKey.data.apiKeySecretHashed;

    return createdApiKey.data;
  }

  async handleGithubWebhook(
    context: DevConsoleApiContext,
    event: GitHubWebhookPayload,
  ) {
    const repoId = event.repository.id;
    new Lmas().writeLog({
      data: event,
      logType: LogType.INFO,
      message: `Received webhook for repo ${repoId}`,
      service: ServiceName.DEV_CONSOLE,
      location: 'DeployService.handleGithubWebhook',
    });
    const deployMS = new DeployMicroservice(context);

    try {
      const config = await deployMS.getDeployConfigByRepoId(repoId);

      if (event.ref !== `refs/heads/${config.data.branchName}`) {
        return;
      }

      new Lmas().writeLog({
        data: event,
        logType: LogType.INFO,
        message: `Deploying ${config.data.websiteUuid}`,
        service: ServiceName.DEV_CONSOLE,
        location: 'DeployService.handleGithubWebhook',
      });

      await deployMS.triggerGithubDeploy({
        url: event.repository.clone_url,
        configId: config.data.id,
        ...config.data,
      });
    } catch (e) {
      // DeployConfig might not yet exist for this repo so just return 200 so github won't show error
    }
  }

  async getProjectConfig(context: DevConsoleApiContext, projectUuid: string) {
    return (await new DeployMicroservice(context).getProjectConfig(projectUuid))
      .data;
  }

  async createDeploymentConfig(
    context: DevConsoleApiContext,
    body: CreateDeploymentConfigDto,
  ) {
    let apiSecretRaw: string;
    if (!body.apiKey || !body.apiSecret) {
      const createdApiKey = await this.createAndPopulateApiKeyForDeploy(
        body,
        context,
      );
      apiSecretRaw = createdApiKey.apiKeySecret;
    }

    const createdDeploymentConfig = (
      await new DeployMicroservice(context).createDeploymentConfig(body)
    ).data;

    return {
      ...createdDeploymentConfig,
      apiSecretRaw,
    };
  }

  async updateDeploymentConfig(
    context: DevConsoleApiContext,
    id: number,
    body: UpdateDeploymentConfigDto,
  ) {
    return (
      await new DeployMicroservice(context).updateDeploymentConfig(id, body)
    ).data;
  }

  async linkGithub(context: DevConsoleApiContext, body: GithubLinkDto) {
    return (await new DeployMicroservice(context).linkGithub(body)).data;
  }

  async unlinkGithub(context: DevConsoleApiContext, body: GithubUnlinkDto) {
    return (await new DeployMicroservice(context).unlinkGithub(body)).data;
  }

  async deleteDeploymentConfig(
    context: DevConsoleApiContext,
    websiteUuid: string,
  ) {
    return (
      await new DeployMicroservice(context).deleteDeploymentConfig(websiteUuid)
    ).data;
  }

  async listRepos(context: DevConsoleApiContext, project_uuid: string) {
    return (await new DeployMicroservice(context).listRepos(project_uuid)).data;
  }

  async listDeploymentBuilds(
    context: DevConsoleApiContext,
    filter: DeploymentBuildQueryFilter,
  ) {
    return (await new DeployMicroservice(context).listDeploymentBuilds(filter))
      .data;
  }

  async setEnvironmentVariables(
    context: DevConsoleApiContext,
    body: SetEnvironmentVariablesDto,
  ) {
    return (await new DeployMicroservice(context).setEnvironmentVariables(body))
      .data;
  }

  async getEnvironmentVariables(
    context: DevConsoleApiContext,
    deploymentConfigId: number,
  ) {
    return (
      await new DeployMicroservice(context).getEnvironmentVariables(
        deploymentConfigId,
      )
    ).data;
  }

  async getDeploymentConfig(
    context: DevConsoleApiContext,
    websiteUuid: string,
  ) {
    return (
      await new DeployMicroservice(context).getDeploymentConfig(websiteUuid)
    ).data;
  }

  async deployNftWebsite(
    context: DevConsoleApiContext,
    body: DeployNftWebsiteDto,
  ) {
    const nftsMS = new NftsMicroservice(context);
    const collection = (await nftsMS.getNftCollection(body.collectionUuid))
      .data;

    const storageMS = new StorageMicroservice(context);

    const website = (
      await storageMS.createWebsite(
        new CreateWebsiteDto({}, context).populate({
          project_uuid: collection.project_uuid,
          name: `${collection.name} - Website`,
          nftCollectionUuid: collection.collection_uuid,
          source: WebsiteSource.GITHUB,
        }),
      )
    ).data;

    let apiSecretRaw: string;
    if (!body.apiKey || !body.apiSecret) {
      const createdApiKey = await this.createAndPopulateApiKeyForDeploy(
        body,
        context,
      );

      apiSecretRaw = createdApiKey.apiKeySecret;
    }

    await new DeployMicroservice(context).triggerWebDeploy(
      new NftWebsiteDeployDto({}, context).populate({
        websiteUuid: website.website_uuid,
        apiKey: body.apiKey,
        apiSecret: body.apiSecret,
        contractAddress: collection.contractAddress,
        chainId: collection.chain,
        type: body.type,
      }),
    );

    await nftsMS.setWebsiteUuid(
      collection.collection_uuid,
      website.website_uuid,
    );

    return {
      ...website,
      apiSecretRaw,
    };
  }
}
