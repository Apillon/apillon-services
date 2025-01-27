import {
  CreateDeploymentConfigDto,
  GitHubWebhookPayload,
  StorageMicroservice,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';

@Injectable()
export class DeployService {
  async handleGithubWebhook(
    context: DevConsoleApiContext,
    event: GitHubWebhookPayload,
  ) {
    const repoId = event.repository.id;

    const storageMS = new StorageMicroservice(context);

    const config = await storageMS.getDeployConfigByRepoId(repoId);

    if (event.ref === `refs/heads/${config.branchName}`) {
      const url = event.repository.clone_url;
      const urlWithToken = url.replace(
        'https://',
        `https://${config.accessToken}@`,
      );
      await storageMS.triggerGithubDeploy({
        urlWithToken,
        websiteUuid: config.websiteUuid,
        buildCommand: config.buildCommand,
        installCommand: config.installCommand,
        buildDirectory: config.buildDirectory,
        apiKey: config.apiKey,
        apiSecret: config.apiSecret,
      });
    }
  }

  async createDeploymentConfig(
    context: DevConsoleApiContext,
    body: CreateDeploymentConfigDto,
  ) {
    return (await new StorageMicroservice(context).createDeploymentConfig(body))
      .data;
  }
}
