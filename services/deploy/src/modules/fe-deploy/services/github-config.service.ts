import {
  GetProjectConfigType,
  GithubLinkDtoType,
  GithubUnlinkDtoType,
  ListReposType,
  ModelValidationException,
  StorageMicroservice,
} from '@apillon/lib';
import { GithubService } from './github.service';
import { DeployCodeException } from '../../../lib/exceptions';
import { DeployErrorCode } from '../../../config/types';
import { GithubConfigRepository } from '../repositories/github-config.repository';
import { DeploymentConfigRepository } from '../repositories/deployment-config.repository';

export class GithubConfigService {
  constructor(
    private readonly githubService: GithubService,
    private readonly githubConfigRepository: GithubConfigRepository,
    private readonly deploymentConfigRepository: DeploymentConfigRepository,
    private readonly storageMicroservice: StorageMicroservice,
  ) {
    this.githubService = githubService;
    this.githubConfigRepository = githubConfigRepository;
    this.deploymentConfigRepository = deploymentConfigRepository;
  }

  async linkGithub(body: GithubLinkDtoType) {
    const { access_token, refresh_token } = await this.githubService.getTokens(
      body.code,
    );

    if (access_token) {
      const gitUser = await this.githubService.getUser(access_token);

      if (!gitUser?.id) {
        throw new DeployCodeException({
          status: 400,
          code: DeployErrorCode.GITHUB_APP_DENIED_OR_SESSION_EXPIRED,
        });
      }

      const githubProjectConfig =
        await this.githubConfigRepository.getGithubProjectConfigByProjectUuid(
          body.project_uuid,
        );

      if (githubProjectConfig.exists()) {
        throw new DeployCodeException({
          status: 400,
          code: DeployErrorCode.GITHUB_PROJECT_CONFIG_ALREADY_PRESENT,
        });
      }

      githubProjectConfig.populate({
        project_uuid: body.project_uuid,
        access_token,
        refresh_token,
        username: gitUser.login,
      });

      githubProjectConfig.validateOrThrow(ModelValidationException);

      await githubProjectConfig.insert();
      return githubProjectConfig.serialize();
    } else {
      throw new DeployCodeException({
        status: 400,
        code: DeployErrorCode.GITHUB_APP_DENIED_OR_SESSION_EXPIRED,
      });
    }
  }

  async unlinkGithub(body: GithubUnlinkDtoType) {
    const githubProjectConfig =
      await this.githubConfigRepository.getGithubProjectConfigByProjectUuid(
        body.project_uuid,
      );

    if (!githubProjectConfig.exists()) {
      throw new DeployCodeException({
        status: 404,
        code: DeployErrorCode.GITHUB_PROJECT_CONFIG_NOT_FOUND,
      });
    }

    await githubProjectConfig.markDeleted();

    const configs =
      await this.deploymentConfigRepository.getActiveDeploymentConfigByProjectConfigId(
        githubProjectConfig.id,
      );

    await Promise.all(
      configs.map(
        async (config) =>
          await this.githubService.deleteWebhook(
            githubProjectConfig,
            config.repoOwnerName,
            config.repoName,
            config.hookId,
          ),
      ),
    );

    if (configs.length) {
      const websiteUuids = configs.map((config) => config.websiteUuid);

      // Get unique website UUIDs
      const uniqueWebsiteUuids = [...new Set(websiteUuids)];
      await Promise.all([
        this.deploymentConfigRepository.markDeploymentConfigsDeleted(
          configs.map((config) => config.id),
        ),
        this.storageMicroservice.unlinkGithubFromWebsites(uniqueWebsiteUuids),
      ]);
    }

    return true;
  }

  async getProjectConfigByProjectUuid(body: GetProjectConfigType) {
    const projectConfig =
      await this.githubConfigRepository.getGithubProjectConfigByProjectUuid(
        body.project_uuid,
      );

    if (!projectConfig.exists()) {
      return false;
    }

    return projectConfig.serialize();
  }

  async listRepos({ project_uuid }: ListReposType) {
    const projectConfig =
      await this.githubConfigRepository.getGithubProjectConfigByProjectUuid(
        project_uuid,
      );

    if (!projectConfig.exists()) {
      throw new DeployCodeException({
        status: 404,
        code: DeployErrorCode.GITHUB_PROJECT_CONFIG_NOT_FOUND,
      });
    }

    return await this.githubService.getRepos(projectConfig);
  }
}
