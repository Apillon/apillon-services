import {
  BackendsQueryFilter,
  DeployEventType,
  DeployMSEventType,
  env,
  Lmas,
  ResizeInstanceDto,
} from '@apillon/lib';
import { BackendStrategyHandler } from './modules/deploy/backendStrategy.handler';
import { ServiceContext } from '@apillon/service-lib';
import { PhalaDockerDeployStrategy } from './modules/deploy/services/phala-docker-deploy.strategy';
import { PhalaDockerClient } from './modules/deploy/clients/phala-tee.client';
import { DeployRepository } from './modules/deploy/repositores/deploy-repository';
import { BackendController } from './modules/deploy/backend.controller';
import { FrontendController } from './modules/fe-deploy/frontend.controller';

/**
 * Processing lambda event with appropriate service function based on event name
 * @param event lambda event
 * @param context lambda context
 * @returns service response
 */
export async function processEvent(
  event: DeployMSEventType,
  context: ServiceContext,
): Promise<any> {
  const eventName = event.eventName;

  if (eventName?.slice(0, 2) === 'fe') {
    const frontendController = new FrontendController(context);
    switch (event.eventName) {
      case DeployEventType.TRIGGER_GITHUB_DEPLOY:
        return frontendController.triggerGithubDeploy(event.body);
      case DeployEventType.TRIGGER_WEB_DEPLOY:
        return frontendController.triggerWebDeploy(event.body);
      case DeployEventType.GET_DEPLOY_CONFIG_BY_REPO_ID:
        return frontendController.getDeploymentConfigByRepoId(event.body);
      case DeployEventType.GET_PROJECT_GITHUB_CONFIG:
        return frontendController.getGithubConfigByProjectUuid(event.body);
      case DeployEventType.CREATE_DEPLOY_CONFIG:
        return frontendController.createDeploymentConfig(event.body);
      case DeployEventType.UPDATE_DEPLOY_CONFIG:
        return frontendController.updateDeploymentConfig(event.body);
      case DeployEventType.LINK_GITHUB:
        return frontendController.linkGithub(event.body);
      case DeployEventType.UNLINK_GITHUB:
        return frontendController.unlinkGithub(event.body);
      case DeployEventType.LIST_REPOS:
        return frontendController.listRepos(event.body);
      case DeployEventType.LIST_DEPLOYMENT_BUILDS:
        return frontendController.listDeploymentBuildsForWebsite(event.body);
      case DeployEventType.DELETE_DEPLOYMENT_CONFIG:
        return frontendController.deleteDeploymentConfig(event.body);
      case DeployEventType.SET_ENVIRONMENT_VARIABLES:
        return frontendController.setEnvironmentVariables(event.body);
      case DeployEventType.GET_ENVIRONMENT_VARIABLES:
        return frontendController.getEnvironmentVariables(event.body);
      case DeployEventType.GET_DEPLOYMENT_CONFIG:
        return frontendController.getDeploymentConfig(event.body);
      default:
        throw new Error('Invalid Deploy Event Type');
    }
  } else if (eventName && eventName.slice(0, 2) === 'be') {
    const phalaDockerDeployStrategy = new PhalaDockerDeployStrategy(
      new PhalaDockerClient(
        'https://cloud-api.phala.network/api/v1',
        env.DEPLOY_PHALA_CLOUD_API_KEY,
      ),
    );
    const backendController = new BackendController(
      new DeployRepository(context),
      new BackendStrategyHandler(
        context,
        phalaDockerDeployStrategy,
        new Lmas(),
      ),
    );
    switch (event.eventName) {
      case DeployEventType.BE_LIST_BACKENDS:
        return backendController.listBackends(
          new BackendsQueryFilter(event.body),
        );
      case DeployEventType.BE_DEPLOY_DOCKER_COMPOSE:
        return backendController.deployDockerCompose(event.body);
      case DeployEventType.BE_GET_INSTANCE:
        return backendController.getInstance(event.body);
      case DeployEventType.BE_GET_INSTANCE_DETAILS:
        return backendController.getInstanceDetails(event.body);
      case DeployEventType.BE_GET_INSTANCE_STATE:
        return backendController.getInstanceStats(event.body);
      case DeployEventType.BE_GET_INSTANCE_ATTESTATION:
        return backendController.getInstanceAttestation(event.body);
      // case DeployEventType.BE_GET_INSTANCE_BILLING:
      //   return backendController.getInstanceBilling(event.body);
      case DeployEventType.BE_START_INSTANCE:
        return backendController.startInstance(event.body);
      case DeployEventType.BE_SHUTDOWN_INSTANCE:
        return backendController.shutdownInstance(event.body);
      case DeployEventType.BE_STOP_INSTANCE:
        return backendController.stopInstance(event.body);
      case DeployEventType.BE_RESTART_INSTANCE:
        return backendController.restartInstance(event.body);
      case DeployEventType.BE_DESTROY_INSTANCE:
        return backendController.destroyInstance(event.body);
      case DeployEventType.BE_RESIZE_INSTANCE:
        return backendController.resizeInstance(
          new ResizeInstanceDto(event.body),
        );
      default:
        throw new Error('Invalid Deploy Event Type');
    }
  }
}
