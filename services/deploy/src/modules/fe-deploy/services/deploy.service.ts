import {
  AWS_KMS,
  AppEnvironment,
  LogType,
  ModelValidationException,
  NftWebsiteDeployDto,
  NftWebsiteDeployDtoType,
  TriggerGithubDeployDtoType,
  WebsiteDeployDtoType,
  env,
  writeLog,
} from '@apillon/lib';
import { BuildProjectWorkerInterface } from '../../../lib/interfaces/build-project-worker.interface';
import { DeploymentBuildRepository } from '../repositories/deployment-build.repository';
import { inspect } from 'util';
import { sendToWorkerQueue } from '@apillon/workers-lib';
import { WorkerName } from '../../../workers/builder-executor';
import { getNftWebsiteConfig } from '../../../lib/get-nft-website-config';
import { GithubService } from './github.service';
import { DeploymentConfigRepository } from '../repositories/deployment-config.repository';

export class DeployService {
  constructor(
    private readonly deploymentBuildRepository: DeploymentBuildRepository,
    private readonly deploymentConfigRepository: DeploymentConfigRepository,
    private readonly githubService: GithubService,
  ) {}

  async triggerGithubDeploy(body: TriggerGithubDeployDtoType) {
    const deploymentBuild = this.deploymentBuildRepository.create({
      configId: body.configId,
      websiteUuid: body.websiteUuid,
    });

    await deploymentBuild.insert();

    const parameters = {
      ...body,
      deploymentBuildId: deploymentBuild.id,
      variables: [],
      isTriggeredByWebhook: true,
    } as BuildProjectWorkerInterface;

    if (body.encryptedVariables) {
      const kmsClient = new AWS_KMS();
      parameters.variables = JSON.parse(
        await kmsClient.decrypt(body.encryptedVariables, env.DEPLOY_KMS_KEY_ID),
      );
    }

    writeLog(
      LogType.INFO,
      `Parameters for build project worker ${inspect(parameters)}`,
    );

    if (
      env.APP_ENV === AppEnvironment.LOCAL_DEV ||
      env.APP_ENV === AppEnvironment.TEST
    ) {
      await this.deploymentBuildRepository.executeBuildProjectWorkerLocally(
        parameters,
        this.githubService,
      );
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

  static isNftWebsiteDeployDto(body: any): body is NftWebsiteDeployDto {
    return 'contractAddress' in body && 'chainId' in body;
  }

  async triggerWebDeploy(body: NftWebsiteDeployDtoType | WebsiteDeployDtoType) {
    const isNftWebsiteDeploy = DeployService.isNftWebsiteDeployDto(body);

    if (isNftWebsiteDeploy && body.new) {
      const kmsClient = new AWS_KMS();

      const websiteConfigParams = getNftWebsiteConfig(
        body.type,
        body.contractAddress,
        body.chainId,
      );
      const deploymentConfig = this.deploymentConfigRepository.create({
        repoUrl: websiteConfigParams.url,
        repoName: 'Nft website',
        repoOwnerName: 'Apillon',
        hookId: 0,
        branchName: 'master',
        websiteUuid: body.websiteUuid,
        buildCommand: websiteConfigParams.buildCommand,
        buildDirectory: websiteConfigParams.buildDirectory,
        installCommand: websiteConfigParams.installCommand,
        apiKey: body.apiKey,
        apiSecret: await kmsClient.encrypt(
          body.apiSecret,
          env.DEPLOY_KMS_KEY_ID,
        ),
        encryptedVariables: await kmsClient.encrypt(
          JSON.stringify(websiteConfigParams.variables),
          env.DEPLOY_KMS_KEY_ID,
        ),
      });

      await deploymentConfig.validateOrThrow(ModelValidationException);

      await deploymentConfig.insert();
    } else if (!isNftWebsiteDeploy && body.new) {
      const webBody = body as WebsiteDeployDtoType;
      const kmsClient = new AWS_KMS();

      const deploymentConfig = this.deploymentConfigRepository.create({
        repoUrl: webBody.url,
        repoName: 'Web',
        repoOwnerName: 'Apillon',
        hookId: 0,
        branchName: 'master',
        websiteUuid: body.websiteUuid,
        buildCommand: webBody.buildCommand,
        buildDirectory: webBody.buildDirectory,
        installCommand: webBody.installCommand,
        apiKey: webBody.apiKey,
        apiSecret: await kmsClient.encrypt(
          webBody.apiSecret,
          env.DEPLOY_KMS_KEY_ID,
        ),
        encryptedVariables: await kmsClient.encrypt(
          JSON.stringify(webBody.variables),
          env.DEPLOY_KMS_KEY_ID,
        ),
      });

      await deploymentConfig.validateOrThrow(ModelValidationException);

      await deploymentConfig.insert();
    }

    const deploymentBuild = this.deploymentBuildRepository.create({
      websiteUuid: body.websiteUuid,
    });

    await deploymentBuild.insert();

    const parameters = {
      deploymentBuildId: deploymentBuild.id,
      ...body,
      ...(isNftWebsiteDeploy && body.new
        ? getNftWebsiteConfig(body.type, body.contractAddress, body.chainId)
        : {}),
      isRedeploy: !body.new,
    } as BuildProjectWorkerInterface;

    writeLog(
      LogType.INFO,
      `Parameters for build project worker ${inspect(parameters)}`,
    );

    if (
      env.APP_ENV === AppEnvironment.LOCAL_DEV ||
      env.APP_ENV === AppEnvironment.TEST
    ) {
      await this.deploymentBuildRepository.executeBuildProjectWorkerLocally(
        parameters,
        this.githubService,
      );
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
