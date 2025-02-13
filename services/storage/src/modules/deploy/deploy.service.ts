import { ServiceContext } from '@apillon/service-lib';
import { DeploymentConfig } from './models/deployment-config.model';
import {
  StorageNotFoundException,
  StorageValidationException,
} from '../../lib/exceptions';
import { StorageErrorCode } from '../../config/types';
import {
  QueueWorkerType,
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
  sendToWorkerQueue,
} from '@apillon/workers-lib';
import {
  AWS_KMS,
  AppEnvironment,
  CreateDeploymentConfigDto,
  DeploymentBuildQueryFilter,
  DeploymentBuildStatus,
  GithubLinkDto,
  LogType,
  env,
  writeLog,
} from '@apillon/lib';
import { BuildProjectWorker } from '../../workers/build-project-worker';
import { WorkerName } from '../../workers/builder-executor';

import { Website } from '../hosting/models/website.model';
import { inspect } from 'node:util';
import { DeploymentBuild } from './models/deployment-build.model';
import { GithubProjectConfig } from './models/github-project-config.model';
import { createWebhook, getRepos, getTokens, getUser } from '../../lib/github';

export class DeployService {
  static async linkGithub(
    // FE gets the code by calling https://github.com/login/oauth/authorize?client_id=#
    event: { body: GithubLinkDto },
    context: ServiceContext,
  ) {
    const { access_token, refresh_token } = await getTokens(event.body.code);

    if (access_token) {
      const gitUser = await getUser(access_token);

      if (!gitUser?.id) {
        throw new StorageNotFoundException(
          StorageErrorCode.GITHUB_APP_DENIED_OR_SESSION_EXPIRED,
        );
      }

      const githubProjectConfig = await new GithubProjectConfig(
        {},
        context,
      ).populateByProjectUuid(event.body.project_uuid);

      if (githubProjectConfig.exists()) {
        throw new StorageNotFoundException(
          StorageErrorCode.GITHUB_PROJECT_CONFIG_ALREADY_PRESENT,
        );
      }

      githubProjectConfig.populate({
        project_uuid: event.body.project_uuid,
        access_token,
        refresh_token,
        username: gitUser.login,
      });

      githubProjectConfig.validateOrThrow(StorageValidationException);

      await githubProjectConfig.insert();
      return githubProjectConfig.serialize();
    } else {
      throw new StorageNotFoundException(
        StorageErrorCode.GITHUB_APP_DENIED_OR_SESSION_EXPIRED,
      );
    }
  }

  static async unlinkGithub(
    event: { body: GithubLinkDto },
    context: ServiceContext,
  ) {
    const githubProjectConfig = await new GithubProjectConfig(
      {},
      context,
    ).populateByProjectUuid(event.body.project_uuid);

    if (!githubProjectConfig.exists()) {
      throw new StorageNotFoundException(
        StorageErrorCode.GITHUB_PROJECT_CONFIG_NOT_FOUND,
      );
    }

    await githubProjectConfig.markDeleted();

    const configs = await new DeploymentConfig(
      {},
      context,
    ).findActiveByProjectConfig(githubProjectConfig.id);

    await Promise.all(
      configs.map((config) => config.deleteConfigWebhook(githubProjectConfig)),
    );

    configs.length &&
      (await new DeploymentConfig({}, context).markDeletedByIds(
        configs.map((config) => config.id),
      ));

    return true;
  }

  static async createDeploymentConfig(
    event: { body: CreateDeploymentConfigDto },
    context: ServiceContext,
  ) {
    const config = await new DeploymentConfig({}, context).findByRepoId(
      event.body.repoId,
    );

    if (config.exists()) {
      throw new StorageNotFoundException(
        StorageErrorCode.DEPLOYMENT_CONFIG_ALREADY_EXISTS,
      );
    }

    const website: Website = await new Website({}, context).populateById(
      event.body.websiteUuid,
    );

    if (!website.exists()) {
      throw new StorageNotFoundException(StorageErrorCode.WEBSITE_NOT_FOUND);
    }

    website.canModify(context);

    const githubProjectConfig = await new GithubProjectConfig(
      {},
      context,
    ).populateByProjectUuid(website.project_uuid);

    if (!githubProjectConfig.exists()) {
      throw new StorageNotFoundException(
        StorageErrorCode.GITHUB_PROJECT_CONFIG_NOT_FOUND,
      );
    }

    const createdWebhook = await createWebhook(
      githubProjectConfig,
      event.body.repoName,
    );

    const kmsClient = new AWS_KMS();

    const deploymentConfig = new DeploymentConfig({}, context).populate({
      ...event.body,
      hookId: createdWebhook.id,
      projectConfigId: githubProjectConfig.id,
      apiSecret: await kmsClient.encrypt(
        event.body.apiSecret,
        env.DEPLOY_KMS_KEY_ID,
      ),
    });

    await deploymentConfig.validateOrThrow(StorageValidationException);

    await deploymentConfig.insert();

    return deploymentConfig;
  }

  static async deleteDeploymentConfig(
    event: { websiteUuid: string },
    context: ServiceContext,
  ) {
    const website = await new Website({}, context).populateByUUID(
      event.websiteUuid,
    );

    if (!website.exists()) {
      throw new StorageNotFoundException(StorageErrorCode.WEBSITE_NOT_FOUND);
    }

    website.canModify(context);

    const githubProjectConfig = await new GithubProjectConfig(
      {},
      context,
    ).populateByProjectUuid(website.project_uuid);

    if (!githubProjectConfig.exists()) {
      throw new StorageNotFoundException(
        StorageErrorCode.GITHUB_PROJECT_CONFIG_NOT_FOUND,
      );
    }

    const deploymentConfigs = await new DeploymentConfig(
      {},
      context,
    ).findActiveByWebsiteUuid(event.websiteUuid);

    await Promise.all(
      deploymentConfigs.map((config) =>
        config.deleteConfigWebhook(githubProjectConfig),
      ),
    );

    deploymentConfigs.length &&
      (await new DeploymentConfig({}, context).markDeletedByIds(
        deploymentConfigs.map((config) => config.id),
      ));

    return true;
  }

  static async getDeploymentConfigByRepoId(
    event: { repoId: number },
    context: ServiceContext,
  ) {
    const config = await new DeploymentConfig({}, context).findByRepoId(
      event.repoId,
    );

    if (!config.exists()) {
      throw new StorageNotFoundException(
        StorageErrorCode.GITHUB_DEPLOYMENT_CONFIG_NOT_FOUND,
      );
    }

    return config.serialize();
  }

  static async getProjectConfigByProjectUuid(
    event: { project_uuid: string },
    context: ServiceContext,
  ) {
    const projectConfig = await new GithubProjectConfig(
      {},
      context,
    ).populateByProjectUuid(event.project_uuid);

    if (!projectConfig.exists()) {
      return false;
    }

    return projectConfig.serialize();
  }

  static async listRepos(
    event: {
      projectUuid: string;
    },
    context: ServiceContext,
  ) {
    const projectConfig = await new GithubProjectConfig(
      {},
      context,
    ).populateByProjectUuid(event.projectUuid);

    if (!projectConfig.exists()) {
      throw new StorageNotFoundException(
        StorageErrorCode.GITHUB_PROJECT_CONFIG_NOT_FOUND,
      );
    }

    return await getRepos(projectConfig);
  }

  static async listDeploymentBuildsForWebsite(
    event: { filter: DeploymentBuildQueryFilter },
    context: ServiceContext,
  ) {
    const website = await new Website({}, context).populateByUUID(
      event.filter.websiteUuid,
    );

    if (!website.exists()) {
      throw new StorageNotFoundException(StorageErrorCode.WEBSITE_NOT_FOUND);
    }

    website.canAccess(context);

    const filter = new DeploymentBuildQueryFilter(event.filter, context);
    return await new DeploymentBuild({}, context).listForWebsite(filter);
  }

  static async triggerGithubDeploy(
    event: {
      url: string;
      websiteUuid: string;
      buildCommand: string | null;
      installCommand: string | null;
      buildDirectory: string;
      apiKey: string;
      apiSecret: string;
      configId: number;
    },
    context: ServiceContext,
  ) {
    const deploymentBuild = new DeploymentBuild({}, context).populate({
      buildStatus: DeploymentBuildStatus.PENDING,
      websiteUuid: event.websiteUuid,
    });

    await deploymentBuild.insert();

    const parameters = {
      ...event,
      deploymentBuildId: deploymentBuild.id,
    };

    writeLog(
      LogType.INFO,
      `Parameters for build project worker ${inspect(parameters)}`,
    );

    if (
      env.APP_ENV === AppEnvironment.LOCAL_DEV ||
      env.APP_ENV === AppEnvironment.TEST
    ) {
      const serviceDef: ServiceDefinition = {
        type: ServiceDefinitionType.SQS,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      };
      const wd = new WorkerDefinition(
        serviceDef,
        WorkerName.BUILD_PROJECT_WORKER,
        {
          parameters,
        },
      );

      const builderWorker = new BuildProjectWorker(
        wd,
        context,
        QueueWorkerType.EXECUTOR,
      );
      await builderWorker.runExecutor(parameters);
    } else {
      await sendToWorkerQueue(
        env.BUILDER_SQS_URL,
        WorkerName.BUILD_PROJECT_WORKER,
        [parameters],
        null,
        null,
      );
    }

    return true;
  }
}
