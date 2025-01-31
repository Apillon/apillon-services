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
  AppEnvironment,
  DeploymentBuildStatus,
  LogType,
  SerializeFor,
  env,
  writeLog,
} from '@apillon/lib';
import { BuildProjectWorker } from '../../workers/build-project-worker';
import { WorkerName } from '../../workers/builder-executor';
import { CreateDeploymentConfigDto } from '@apillon/lib/src';
import { Website } from '../hosting/models/website.model';
import { encrypt } from '../../lib/encrypt-secret';
import { inspect } from 'node:util';
import { DeploymentBuild } from './models/deployment-build.model';

export class DeployService {
  static async create(
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

    const deploymentConfig = new DeploymentConfig({}, context).populate({
      ...event.body,
      apiSecret: encrypt(
        event.body.apiSecret,
        env.BUILDER_API_SECRET_ENCRYPTION_KEY,
        env.BUILDER_API_SECRET_INITIALIZATION_VECTOR,
      ),
    });

    await deploymentConfig.validateOrThrow(StorageValidationException);

    await deploymentConfig.insert();

    return deploymentConfig;
  }

  static async getConfigByRepoId(
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

    return config;
  }

  static async triggerGithubDeploy(
    event: {
      urlWithToken: string;
      websiteUuid: string;
      buildCommand: string | null;
      installCommand: string | null;
      buildDirectory: string;
      apiKey: string;
      apiSecret: string;
    },
    context: ServiceContext,
  ) {
    const deploymentBuild = new DeploymentBuild({}, context).populate({
      buildStatus: DeploymentBuildStatus.PENDING,
      websiteUuid: event.websiteUuid,
    });

    await deploymentBuild.insert();

    const parameters = {
      url: event.urlWithToken,
      websiteUuid: event.websiteUuid,
      buildCommand: event.buildCommand,
      installCommand: event.installCommand,
      buildDirectory: event.buildDirectory,
      apiKey: event.apiKey,
      apiSecret: event.apiSecret,
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
