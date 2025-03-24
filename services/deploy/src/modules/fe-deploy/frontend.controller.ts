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

export class FrontendController {
  private githubService: GithubService;
  private readonly githubConfigService: GithubConfigService;
  private readonly buildService: BuildService;
  private readonly deploymentConfigService: DeploymentConfigService;
  private readonly deployService: DeployService;

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
      this.githubService,
    );

    this.githubConfigService = new GithubConfigService(
      this.githubService,
      githubConfigRepository,
      deploymentConfigRepository,
    );

    const storageMicroservice = new StorageMicroservice(context);

    this.buildService = new BuildService(
      deploymentBuildRepository,
      storageMicroservice,
    );

    this.deploymentConfigService = new DeploymentConfigService(
      this.githubService,
      githubConfigRepository,
      deploymentConfigRepository,
      this.deployService,
      storageMicroservice,
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
}
