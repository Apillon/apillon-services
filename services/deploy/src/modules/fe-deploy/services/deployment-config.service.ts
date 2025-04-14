import {
  AWS_KMS,
  CreateDeploymentConfigDtoType,
  DeleteDeploymentConfigType,
  GetDeploymentConfigType,
  GetEnvironmentVariablesType,
  ModelValidationException,
  SetEnvironmentVariablesDtoType,
  StorageMicroservice,
  UpdateDeploymentConfigDtoType,
  WebsiteSource,
  env,
  GetDeployConfigByRepoIdType,
} from '@apillon/lib';
import { GithubService } from './github.service';
import { DeployCodeException } from '../../../lib/exceptions';
import { DeployErrorCode } from '../../../config/types';
import { GithubConfigRepository } from '../repositories/github-config.repository';
import { DeploymentConfigRepository } from '../repositories/deployment-config.repository';
import { DeploymentConfig } from '../models/deployment-config.model';
import { DeployService } from './deploy.service';

export class DeploymentConfigService {
  constructor(
    private readonly githubService: GithubService,
    private readonly githubConfigRepository: GithubConfigRepository,
    private readonly deploymentConfigRepository: DeploymentConfigRepository,
    private readonly deployService: DeployService,
    private readonly storageMicroservice: StorageMicroservice,
  ) {}

  async createDeploymentConfig(body: CreateDeploymentConfigDtoType) {
    const config = await this.deploymentConfigRepository.findByRepoId(
      body.repoId,
    );

    if (config.exists()) {
      throw new DeployCodeException({
        status: 400,
        code: DeployErrorCode.DEPLOYMENT_CONFIG_ALREADY_EXISTS,
      });
    }

    if (!body.skipWebsiteCheck) {
      await this.storageMicroservice.getWebsiteWithAccess(
        body.websiteUuid,
        true,
      );
    }

    const githubProjectConfig =
      await this.githubConfigRepository.getGithubProjectConfigByProjectUuid(
        body.projectUuid,
      );

    if (!githubProjectConfig.exists()) {
      throw new DeployCodeException({
        status: 404,
        code: DeployErrorCode.GITHUB_PROJECT_CONFIG_NOT_FOUND,
      });
    }

    const createdWebhook = await this.githubService.createWebhook(
      githubProjectConfig,
      body.repoName,
    );

    const kmsClient = new AWS_KMS();

    const deploymentConfig = this.deploymentConfigRepository.create({
      ...body,
      hookId: createdWebhook.id,
      projectConfigId: githubProjectConfig.id,
      apiSecret: await kmsClient.encrypt(body.apiSecret, env.DEPLOY_KMS_KEY_ID),
    });

    await deploymentConfig.validateOrThrow(ModelValidationException);

    await deploymentConfig.insert();

    await this.storageMicroservice.updateWebsite({
      website_uuid: body.websiteUuid,
      data: {
        source: WebsiteSource.GITHUB,
      },
    });

    const serializedConfig = deploymentConfig.serialize() as DeploymentConfig;

    await this.deployService.triggerGithubDeploy({
      ...serializedConfig,
      configId: serializedConfig.id,
      url: body.repoUrl,
    });

    return deploymentConfig;
  }

  async updateDeploymentConfig({
    id,
    body,
  }: {
    id: number;
    body: UpdateDeploymentConfigDtoType;
  }) {
    const config = await this.deploymentConfigRepository.getById(id);

    if (!config.exists()) {
      throw new DeployCodeException({
        status: 404,
        code: DeployErrorCode.DEPLOYMENT_CONFIG_NOT_FOUND,
      });
    }

    await this.storageMicroservice.getWebsiteWithAccess(
      config.websiteUuid,
      true,
    );

    const {
      apiSecret,
      apiKey,
      websiteUuid: _websiteUuid,
      projectUuid: _projectUuid,
      repoId: _repoId,
      repoUrl: _repoUrl,
      ...updatedFields
    } = body;

    const apiKeyToSet = apiKey ?? config.apiKey;
    const apiSecretToSet = apiSecret
      ? await new AWS_KMS().encrypt(apiSecret, env.DEPLOY_KMS_KEY_ID)
      : config.apiSecret;

    config.populate({
      ...updatedFields,
      apiKey: apiKeyToSet,
      apiSecret: apiSecretToSet,
    });

    await config.validateOrThrow(ModelValidationException);

    await config.update();

    return config.serialize();
  }

  async deleteDeploymentConfigByWebsiteUuid({
    websiteUuid,
  }: DeleteDeploymentConfigType) {
    const website = (
      await this.storageMicroservice.getWebsiteWithAccess(websiteUuid, true)
    ).data;

    const githubProjectConfig =
      await this.githubConfigRepository.getGithubProjectConfigByProjectUuid(
        website.project_uuid,
      );

    if (!githubProjectConfig.exists()) {
      // Archive website is also calling this method & NFT websites are not linked to github
      return true;
    }

    const deploymentConfigs =
      await this.deploymentConfigRepository.getActiveByWebsiteUuid(websiteUuid);

    await Promise.all(
      deploymentConfigs.map(
        async (config) =>
          await this.githubService.deleteWebhook(
            githubProjectConfig,
            config.repoOwnerName,
            config.repoName,
            config.hookId,
          ),
      ),
    );

    deploymentConfigs.length &&
      (await this.deploymentConfigRepository.markDeploymentConfigsDeleted(
        deploymentConfigs.map((config) => config.id),
      ));

    await this.storageMicroservice.updateWebsite({
      website_uuid: websiteUuid,
      data: {
        source: WebsiteSource.APILLON,
      },
    });

    return true;
  }

  async getDeploymentConfigByRepoId(body: GetDeployConfigByRepoIdType) {
    const config = await this.deploymentConfigRepository.findByRepoId(
      body.repoId,
    );

    if (!config.exists()) {
      throw new DeployCodeException({
        status: 404,
        code: DeployErrorCode.DEPLOYMENT_CONFIG_NOT_FOUND,
      });
    }

    return config.serialize();
  }

  async setEnvironmentVariables(body: SetEnvironmentVariablesDtoType) {
    const keys = body.variables.map((variable) => variable.key);
    if (new Set(keys).size !== keys.length) {
      throw new DeployCodeException({
        status: 400,
        code: DeployErrorCode.DEPLOYMENT_CONFIG_VARIABLES_DUPLICATE,
      });
    }

    const deploymentConfig = await this.deploymentConfigRepository.getById(
      body.deploymentConfigId,
    );

    if (!deploymentConfig.exists()) {
      throw new DeployCodeException({
        status: 404,
        code: DeployErrorCode.DEPLOYMENT_CONFIG_NOT_FOUND,
      });
    }

    await this.storageMicroservice.getWebsiteWithAccess(
      deploymentConfig.websiteUuid,
      true,
    );

    if (body.variables?.length) {
      const kmsClient = new AWS_KMS();
      deploymentConfig.encryptedVariables = await kmsClient.encrypt(
        JSON.stringify(body.variables),
        env.DEPLOY_KMS_KEY_ID,
      );
    } else {
      deploymentConfig.encryptedVariables = null;
    }

    await deploymentConfig.validateOrThrow(ModelValidationException);

    return await deploymentConfig.update();
  }

  async getEnvironmentVariables(body: GetEnvironmentVariablesType) {
    const deploymentConfig = await this.deploymentConfigRepository.getById(
      body.deploymentConfigId,
    );

    if (!deploymentConfig.exists()) {
      throw new DeployCodeException({
        status: 404,
        code: DeployErrorCode.DEPLOYMENT_CONFIG_NOT_FOUND,
      });
    }

    await this.storageMicroservice.getWebsiteWithAccess(
      deploymentConfig.websiteUuid,
      false,
    );

    return await deploymentConfig.getEnvironmentVariables();
  }

  async getDeploymentConfig(
    body: GetDeploymentConfigType,
  ): Promise<DeploymentConfig | boolean> {
    await this.storageMicroservice.getWebsiteWithAccess(
      body.websiteUuid,
      false,
    );

    const deploymentConfigs =
      await this.deploymentConfigRepository.getActiveByWebsiteUuid(
        body.websiteUuid,
      );

    if (!deploymentConfigs.length) {
      return false;
    }

    return deploymentConfigs[0].serialize() as DeploymentConfig;
  }
}
