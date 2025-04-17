import {
  CreateDeploymentConfigDtoType,
  DeleteDeploymentConfigType,
  DeploymentBuildQueryFilter,
  GetDeploymentConfigType,
  GetEnvironmentVariablesType,
  GetProjectConfigType,
  GithubLinkDtoType,
  GithubUnlinkDtoType,
  ListReposType,
  NftWebsiteDeployDtoType,
  SetEnvironmentVariablesDtoType,
  StorageMicroservice,
  TriggerGithubDeployDtoType,
  UpdateDeploymentConfigDtoType,
  WebsiteDeployDtoType,
  GetDeployConfigByRepoIdType,
  env,
  AWS_KMS,
} from '@apillon/lib';
import { DeployService } from './services/deploy.service';
import { DeploymentConfigService } from './services/deployment-config.service';
import { GithubConfigService } from './services/github-config.service';
import { BuildService } from './services/build.service';
import { ServiceContext } from '@apillon/service-lib';
import { DeploymentBuildRepository } from './repositories/deployment-build.repository';
import { GithubConfigRepository } from './repositories/github-config.repository';
import { DeploymentConfigRepository } from './repositories/deployment-config.repository';
import { GithubService } from './services/github.service';
import { RedeployWebsiteType } from '@apillon/lib';
import { DeployCodeException } from '../../lib/exceptions';
import { DeployErrorCode } from '../../config/types';

export class FrontendController {
  private githubService: GithubService;
  private readonly githubConfigService: GithubConfigService;
  private readonly buildService: BuildService;
  private readonly deploymentConfigService: DeploymentConfigService;
  private readonly deployService: DeployService;
  private readonly storageMicroservice: StorageMicroservice;

  static initializeFrontendRepositories = (context: ServiceContext) => {
    return {
      deploymentBuildRepository: new DeploymentBuildRepository(context),
      githubConfigRepository: new GithubConfigRepository(context),
      deploymentConfigRepository: new DeploymentConfigRepository(context),
    };
  };

  constructor(context: ServiceContext) {
    const {
      deploymentBuildRepository,
      githubConfigRepository,
      deploymentConfigRepository,
    } = FrontendController.initializeFrontendRepositories(context);

    this.githubService = new GithubService();
    this.deployService = new DeployService(
      deploymentBuildRepository,
      deploymentConfigRepository,
      this.githubService,
    );

    this.storageMicroservice = new StorageMicroservice(context);

    this.githubConfigService = new GithubConfigService(
      this.githubService,
      githubConfigRepository,
      deploymentConfigRepository,
      this.storageMicroservice,
    );

    this.buildService = new BuildService(
      deploymentBuildRepository,
      this.storageMicroservice,
    );

    this.deploymentConfigService = new DeploymentConfigService(
      this.githubService,
      githubConfigRepository,
      deploymentConfigRepository,
      this.deployService,
      this.storageMicroservice,
    );
  }

  async triggerGithubDeploy(body: TriggerGithubDeployDtoType) {
    return this.deployService.triggerGithubDeploy(body);
  }

  async triggerWebDeploy(body: NftWebsiteDeployDtoType | WebsiteDeployDtoType) {
    return this.deployService.triggerWebDeploy(body);
  }

  async getDeploymentConfigByRepoId(body: GetDeployConfigByRepoIdType) {
    return this.deploymentConfigService.getDeploymentConfigByRepoId(body);
  }

  async getGithubConfigByProjectUuid(body: GetProjectConfigType) {
    return this.githubConfigService.getProjectConfigByProjectUuid(body);
  }

  async createDeploymentConfig(body: CreateDeploymentConfigDtoType) {
    return this.deploymentConfigService.createDeploymentConfig(body);
  }

  async updateDeploymentConfig(body: {
    id: number;
    body: UpdateDeploymentConfigDtoType;
  }) {
    return this.deploymentConfigService.updateDeploymentConfig(body);
  }

  async linkGithub(body: GithubLinkDtoType) {
    return this.githubConfigService.linkGithub(body);
  }

  async unlinkGithub(body: GithubUnlinkDtoType) {
    return this.githubConfigService.unlinkGithub(body);
  }

  async listRepos(body: ListReposType) {
    return this.githubConfigService.listRepos(body);
  }

  async listDeploymentBuildsForWebsite(body: DeploymentBuildQueryFilter) {
    return this.buildService.listDeploymentBuildsForWebsite(body);
  }

  async deleteDeploymentConfig(body: DeleteDeploymentConfigType) {
    return this.deploymentConfigService.deleteDeploymentConfigByWebsiteUuid(
      body,
    );
  }

  async setEnvironmentVariables(body: SetEnvironmentVariablesDtoType) {
    return this.deploymentConfigService.setEnvironmentVariables(body);
  }

  async getEnvironmentVariables(body: GetEnvironmentVariablesType) {
    return this.deploymentConfigService.getEnvironmentVariables(body);
  }

  async getDeploymentConfig(body: GetDeploymentConfigType) {
    return this.deploymentConfigService.getDeploymentConfig(body);
  }

  async redeployWebsite(body: RedeployWebsiteType) {
    const website = (
      await this.storageMicroservice.getWebsiteWithAccess(
        body.websiteUuid,
        false,
      )
    ).data;

    const config = await this.getDeploymentConfig({
      websiteUuid: body.websiteUuid,
    });

    if (typeof config === 'boolean') {
      throw new DeployCodeException({
        status: 404,
        code: DeployErrorCode.DEPLOYMENT_CONFIG_NOT_FOUND,
      });
    }

    if (website.nftCollectionUuid) {
      const kmsClient = new AWS_KMS();
      await this.deployService.triggerWebDeploy({
        websiteUuid: body.websiteUuid,
        apiKey: config.apiKey,
        apiSecret: config.apiSecret,
        installCommand: config.installCommand,
        buildCommand: config.buildCommand,
        buildDirectory: config.buildDirectory,
        url: config.repoUrl,
        variables: JSON.parse(
          await kmsClient.decrypt(
            config.encryptedVariables,
            env.DEPLOY_KMS_KEY_ID,
          ),
        ),
      } as WebsiteDeployDtoType);
    } else if (false) {
      // TODO: Add support for simplets (differentiate between simplet and github)
    } else {
      await this.deployService.triggerGithubDeploy({
        configId: config.id,
        url: config.repoUrl,
        ...config,
      });
    }

    return true;
  }
}
