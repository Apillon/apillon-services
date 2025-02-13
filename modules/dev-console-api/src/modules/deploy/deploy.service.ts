import {
  CreateDeploymentConfigDto,
  DeploymentBuildQueryFilter,
  GithubLinkDto,
  Lmas,
  LogType,
  ServiceName,
  StorageMicroservice,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { GithubUnlinkDto } from '@apillon/lib';
import { GitHubWebhookPayload } from '../../config/types';

@Injectable()
export class DeployService {
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
    const storageMS = new StorageMicroservice(context);

    const config = await storageMS.getDeployConfigByRepoId(repoId);

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
    await storageMS.triggerGithubDeploy({
      url: event.repository.clone_url,
      configId: config.data.id,
      ...config.data,
    });
  }

  async getProjectConfig(context: DevConsoleApiContext, projectUuid: string) {
    return (
      await new StorageMicroservice(context).getProjectConfig(projectUuid)
    ).data;
  }

  async createDeploymentConfig(
    context: DevConsoleApiContext,
    body: CreateDeploymentConfigDto,
  ) {
    return (await new StorageMicroservice(context).createDeploymentConfig(body))
      .data;
  }

  async linkGithub(context: DevConsoleApiContext, body: GithubLinkDto) {
    return (await new StorageMicroservice(context).linkGithub(body)).data;
  }

  async unlinkGithub(context: DevConsoleApiContext, body: GithubUnlinkDto) {
    return (await new StorageMicroservice(context).unlinkGithub(body)).data;
  }

  async deleteDeploymentConfig(
    context: DevConsoleApiContext,
    websiteUuid: string,
  ) {
    return (
      await new StorageMicroservice(context).deleteDeploymentConfig(websiteUuid)
    ).data;
  }

  async listRepos(context: DevConsoleApiContext, project_uuid: string) {
    return (await new StorageMicroservice(context).listRepos(project_uuid))
      .data;
  }

  async listDeploymentBuilds(
    context: DevConsoleApiContext,
    filter: DeploymentBuildQueryFilter,
  ) {
    return (await new StorageMicroservice(context).listDeploymentBuilds(filter))
      .data;
  }
}
