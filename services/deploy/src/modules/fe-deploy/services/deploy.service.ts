import {
  AWS_KMS,
  AppEnvironment,
  LogType,
  NftWebsiteDeployDto,
  WebsiteDeployDto,
  env,
  writeLog,
} from '@apillon/lib';
import { BuildProjectWorkerInterface } from '../../../lib/interfaces/build-project-worker.interface';
import { DeploymentBuildRepository } from '../repositories/deployment-build.repository';
import { inspect } from 'util';
import { sendToWorkerQueue } from '@apillon/workers-lib';
import { WorkerName } from '../../../workers/builder-executor.handler';
import { getNftWebsiteConfig } from '../../../lib/get-nft-website-config';
import { GithubService } from './github.service';

export class DeployService {
  constructor(
    private readonly deploymentBuildRepository: DeploymentBuildRepository,
    private readonly githubService: GithubService,
  ) {}

  async triggerGithubDeploy(body: {
    url: string;
    websiteUuid: string;
    buildCommand: string | null;
    installCommand: string | null;
    buildDirectory: string;
    apiKey: string;
    apiSecret: string;
    configId: number;
    encryptedVariables: string | null;
  }) {
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

  async triggerWebDeploy(body: NftWebsiteDeployDto | WebsiteDeployDto) {
    const deploymentBuild = this.deploymentBuildRepository.create({
      websiteUuid: body.websiteUuid,
    });

    await deploymentBuild.insert();

    const parameters = {
      deploymentBuildId: deploymentBuild.id,
      ...body,
      ...(DeployService.isNftWebsiteDeployDto(body)
        ? getNftWebsiteConfig(body.type, body.contractAddress, body.chainId)
        : {}),
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
