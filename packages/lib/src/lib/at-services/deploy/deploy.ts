import { env } from '../../../config/env';
import { AppEnvironment, DeployEventType } from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { DeployInstanceDto } from './dtos/deploy-instance.dto';
import { DeployMSEventType } from './eventTypes';
import { BackendsQueryFilter } from './dtos/backends-query-filter.dto';
import { GenericDeployRequestDto } from './dtos/generic-deploy-request.dto';
import { ResizeInstanceDto } from './dtos/resize-instance.dto';
import { UpdateDeploymentConfigDto } from './dtos/update-deployment-config.dto';
import { GithubLinkDto } from './dtos/github-link.dto';
import { GithubUnlinkDto } from './dtos/github-unlink.dto';
import { DeploymentBuildQueryFilter } from './dtos/deployment-build-query-filter.dto';
import { SetEnvironmentVariablesDto } from '../storage/dtos/set-environment-variables.dto';
import { NftWebsiteDeployDto } from './dtos/nft-website-deploy.dto';
import { WebsiteDeployDto } from '../storage/dtos/website-deploy.dto';
import { CreateDeploymentConfigDto } from './dtos/create-deployment-config.dto';
import { TriggerGithubDeployDto } from './dtos/trigger-github-deploy.dto';

export class DeployMicroservice extends BaseService {
  lambdaFunctionName =
    env.APP_ENV === AppEnvironment.TEST
      ? env.DEPLOY_FUNCTION_NAME_TEST
      : env.DEPLOY_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.DEPLOY_SOCKET_PORT_TEST
      : env.DEPLOY_SOCKET_PORT;
  serviceName = 'DEPLOY';

  constructor(context: Context) {
    super(context);
    this.isDefaultAsync = false;
  }

  async emitEvent(event: DeployMSEventType) {
    return await this.callService(event);
  }

  public async deployDockerCompose(body: DeployInstanceDto) {
    return await this.emitEvent({
      eventName: DeployEventType.BE_DEPLOY_DOCKER_COMPOSE,
      body,
    });
  }

  public async listBackends(body: BackendsQueryFilter) {
    return await this.emitEvent({
      eventName: DeployEventType.BE_LIST_BACKENDS,
      body,
    });
  }

  public async getInstance(body: GenericDeployRequestDto) {
    return await this.emitEvent({
      eventName: DeployEventType.BE_GET_INSTANCE,
      body,
    });
  }

  public async getInstanceDetails(body: GenericDeployRequestDto) {
    return await this.emitEvent({
      eventName: DeployEventType.BE_GET_INSTANCE_DETAILS,
      body,
    });
  }

  public async startInstance(body: GenericDeployRequestDto) {
    return await this.emitEvent({
      eventName: DeployEventType.BE_START_INSTANCE,
      body,
    });
  }

  public async shutdownInstance(body: GenericDeployRequestDto) {
    return await this.emitEvent({
      eventName: DeployEventType.BE_SHUTDOWN_INSTANCE,
      body,
    });
  }

  public async stopInstance(body: GenericDeployRequestDto) {
    return await this.emitEvent({
      eventName: DeployEventType.BE_STOP_INSTANCE,
      body,
    });
  }

  public async restartInstance(body: GenericDeployRequestDto) {
    return await this.emitEvent({
      eventName: DeployEventType.BE_RESTART_INSTANCE,
      body,
    });
  }

  public async destroyInstance(body: GenericDeployRequestDto) {
    return await this.emitEvent({
      eventName: DeployEventType.BE_DESTROY_INSTANCE,
      body,
    });
  }

  public async resizeInstance(body: ResizeInstanceDto) {
    return await this.emitEvent({
      eventName: DeployEventType.BE_RESIZE_INSTANCE,
      body,
    });
  }

  public async getInstanceState(body: GenericDeployRequestDto) {
    return await this.emitEvent({
      eventName: DeployEventType.BE_GET_INSTANCE_STATE,
      body,
    });
  }

  public async getInstanceAttestation(body: GenericDeployRequestDto) {
    return await this.emitEvent({
      eventName: DeployEventType.BE_GET_INSTANCE_ATTESTATION,
      body,
    });
  }

  public async triggerGithubDeploy(payload: TriggerGithubDeployDto) {
    const data = {
      eventName: DeployEventType.TRIGGER_GITHUB_DEPLOY,
      ...payload,
    };
    return await this.callService(data);
  }

  public async getDeployConfigByRepoId(repoId: number) {
    const data = {
      eventName: DeployEventType.GET_DEPLOY_CONFIG_BY_REPO_ID,
      repoId,
    };

    return await this.callService(data);
  }

  public async createDeploymentConfig(params: CreateDeploymentConfigDto) {
    const data = {
      eventName: DeployEventType.CREATE_DEPLOY_CONFIG,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async updateDeploymentConfig(
    id: number,
    params: UpdateDeploymentConfigDto,
  ) {
    const data = {
      eventName: DeployEventType.UPDATE_DEPLOY_CONFIG,
      id,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async linkGithub(params: GithubLinkDto) {
    const data = {
      eventName: DeployEventType.LINK_GITHUB,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async unlinkGithub(params: GithubUnlinkDto) {
    const data = {
      eventName: DeployEventType.UNLINK_GITHUB,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async listRepos(project_uuid: string) {
    const data = {
      eventName: DeployEventType.LIST_REPOS,
      project_uuid,
    };
    return await this.callService(data);
  }

  public async getProjectConfig(project_uuid: string) {
    const data = {
      eventName: DeployEventType.GET_PROJECT_GITHUB_CONFIG,
      project_uuid,
    };
    return await this.callService(data);
  }

  public async listDeploymentBuilds(filter: DeploymentBuildQueryFilter) {
    const data = {
      eventName: DeployEventType.LIST_DEPLOYMENT_BUILDS,
      filter: filter.serialize(),
    };
    return await this.callService(data);
  }

  public async deleteDeploymentConfig(websiteUuid: string) {
    const data = {
      eventName: DeployEventType.DELETE_DEPLOYMENT_CONFIG,
      websiteUuid,
    };
    return await this.callService(data);
  }

  public async setEnvironmentVariables(params: SetEnvironmentVariablesDto) {
    const data = {
      eventName: DeployEventType.SET_ENVIRONMENT_VARIABLES,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async getEnvironmentVariables(deploymentConfigId: number) {
    const data = {
      eventName: DeployEventType.GET_ENVIRONMENT_VARIABLES,
      deploymentConfigId,
    };
    return await this.callService(data);
  }

  public async triggerWebDeploy(
    params: NftWebsiteDeployDto | WebsiteDeployDto,
  ) {
    const data = {
      eventName: DeployEventType.TRIGGER_WEB_DEPLOY,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async getDeploymentConfig(websiteUuid: string) {
    const data = {
      eventName: DeployEventType.GET_DEPLOYMENT_CONFIG,
      websiteUuid,
    };
    return await this.callService(data);
  }

  // public async getInstanceBilling(body: GenericDeployRequestDto) {
  //   return await this.emitEvent({
  //     eventName: DeployEventType.BE_GET_INSTANCE_BILLING,
  //     body,
  //   });
  // }
}
