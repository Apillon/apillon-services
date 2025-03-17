import {
  CreateDeploymentConfigDto,
  DeploymentBuildQueryFilter,
  GithubLinkDto,
  GithubUnlinkDto,
  NftWebsiteDeployDto,
  SetEnvironmentVariablesDto,
  StorageMicroservice,
  UpdateDeploymentConfigDto,
  WebsiteDeployDto,
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
  private readonly githubService: GithubService;
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

  // TO-DO type
  async triggerGithubDeploy(body: any) {
    return this.deployService.triggerGithubDeploy(body);
  }

  async triggerWebDeploy(body: NftWebsiteDeployDto | WebsiteDeployDto) {
    return this.deployService.triggerWebDeploy(body);
  }

  async getDeploymentConfigByRepoId(repoId: number) {
    return this.deploymentConfigService.getDeploymentConfigByRepoId(repoId);
  }

  async getGithubConfigByProjectUuid(projectUuid: string) {
    return this.getGithubConfigByProjectUuid(projectUuid);
  }

  async createDeploymentConfig(body: CreateDeploymentConfigDto) {
    return this.deploymentConfigService.createDeploymentConfig(body);
  }

  async updateDeploymentConfig(body: {
    id: number;
    body: UpdateDeploymentConfigDto;
  }) {
    return this.deploymentConfigService.updateDeploymentConfig(body);
  }

  async linkGithub(body: GithubLinkDto) {
    return this.githubConfigService.linkGithub(body);
  }

  async unlinkGithub(body: GithubUnlinkDto) {
    return this.githubConfigService.unlinkGithub(body);
  }

  async listRepos(projectUuid: string) {
    return this.githubConfigService.listRepos(projectUuid);
  }

  async listDeploymentBuildsForWebsite(body: DeploymentBuildQueryFilter) {
    return this.buildService.listDeploymentBuildsForWebsite(body);
  }

  async deleteDeploymentConfig(websiteUuid: string) {
    return this.deploymentConfigService.deleteDeploymentConfigByWebsiteUuid(
      websiteUuid,
    );
  }

  async setEnvironmentVariables(body: SetEnvironmentVariablesDto) {
    return this.deploymentConfigService.setEnvironmentVariables(body);
  }

  async getEnvironmentVariables(deploymentConfigId: number) {
    return this.deploymentConfigService.getEnvironmentVariables(
      deploymentConfigId,
    );
  }

  async getDeploymentConfig(websiteUuid: string) {
    return this.deploymentConfigService.getDeploymentConfig(websiteUuid);
  }
}
