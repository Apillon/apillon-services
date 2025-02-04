import {
  CreateDeploymentConfigDto,
  DeploymentBuildQueryFilter,
  GitHubWebhookPayload,
  GithubLinkDto,
  Lmas,
  LogType,
  ServiceName,
  StorageMicroservice,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { GithubUnlinkDto } from '@apillon/lib';

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

    new Lmas().writeLog({
      data: event,
      logType: LogType.INFO,
      message: `Config found ${event.ref} ${config.data.branchName} ${event.ref === `refs/heads/${config.branchName}`} `,
      service: ServiceName.DEV_CONSOLE,
      location: 'DeployService.handleGithubWebhook',
    });

    if (event.ref === `refs/heads/${config.data.branchName}`) {
      new Lmas().writeLog({
        data: event,
        logType: LogType.INFO,
        message: `Deploying ${config.data.websiteUuid}`,
        service: ServiceName.DEV_CONSOLE,
        location: 'DeployService.handleGithubWebhook',
      });
      await storageMS.triggerGithubDeploy({
        url: event.repository.clone_url,
        websiteUuid: config.data.websiteUuid,
        buildCommand: config.data.buildCommand,
        installCommand: config.data.installCommand,
        buildDirectory: config.data.buildDirectory,
        apiKey: config.data.apiKey,
        apiSecret: config.data.apiSecret,
        configId: config.data.id,
      });
    }
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
