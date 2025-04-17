import {
  BackendsQueryFilter,
  DeployEventType,
  DeployInstanceDto,
  DeployMSEventType,
  GenericDeployRequestDto,
  ModelValidationException,
  ResizeInstanceDto,
  ValidatorErrorCode,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { BackendController } from './modules/deploy/backend.controller';
import { FrontendController } from './modules/fe-deploy/frontend.controller';
import { inspect } from 'util';

/**
 * Processing lambda event with appropriate service function based on event name
 * @param event lambda event
 * @param context lambda context
 * @param backendController
 * @returns service response
 */
export async function processEvent(
  event: DeployMSEventType,
  context: ServiceContext,
  backendController: BackendController,
): Promise<any> {
  const eventName = event.eventName;
  if (eventName?.slice(0, 2) === 'fe') {
    const frontendController = new FrontendController(context);
    console.log('Event:', inspect(event));
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
    switch (event.eventName) {
      case DeployEventType.BE_LIST_BACKENDS:
        return backendController.listBackends(
          await new BackendsQueryFilter(event.body).validateOrThrow(
            ModelValidationException,
            ValidatorErrorCode,
          ),
        );
      case DeployEventType.BE_DEPLOY_DOCKER_COMPOSE:
        return backendController.deployDockerCompose(
          await new DeployInstanceDto({}, context)
            .populate(event.body)
            .validateOrThrow(ModelValidationException, ValidatorErrorCode),
        );
      case DeployEventType.BE_GET_INSTANCE:
        return backendController.getInstance(
          await new GenericDeployRequestDto({}, context)
            .populate(event.body)
            .validateOrThrow(ModelValidationException, ValidatorErrorCode),
        );
      case DeployEventType.BE_GET_INSTANCE_DETAILS:
        return backendController.getInstanceDetails(
          await new GenericDeployRequestDto({}, context)
            .populate(event.body)
            .validateOrThrow(ModelValidationException, ValidatorErrorCode),
        );
      case DeployEventType.BE_GET_INSTANCE_STATE:
        return backendController.getInstanceStats(
          await new GenericDeployRequestDto({}, context)
            .populate(event.body)
            .validateOrThrow(ModelValidationException, ValidatorErrorCode),
        );
      case DeployEventType.BE_GET_INSTANCE_ATTESTATION:
        return backendController.getInstanceAttestation(
          await new GenericDeployRequestDto({}, context)
            .populate(event.body)
            .validateOrThrow(ModelValidationException, ValidatorErrorCode),
        );
      // case DeployEventType.BE_GET_INSTANCE_BILLING:
      //   return backendController.getInstanceBilling();
      case DeployEventType.BE_START_INSTANCE:
        return backendController.startInstance(
          await new GenericDeployRequestDto({}, context)
            .populate(event.body)
            .validateOrThrow(ModelValidationException, ValidatorErrorCode),
        );
      case DeployEventType.BE_SHUTDOWN_INSTANCE:
        return backendController.shutdownInstance(
          await new GenericDeployRequestDto({}, context)
            .populate(event.body)
            .validateOrThrow(ModelValidationException, ValidatorErrorCode),
        );
      case DeployEventType.BE_STOP_INSTANCE:
        return backendController.stopInstance(
          await new GenericDeployRequestDto({}, context)
            .populate(event.body)
            .validateOrThrow(ModelValidationException, ValidatorErrorCode),
        );
      case DeployEventType.BE_RESTART_INSTANCE:
        return backendController.restartInstance(
          await new GenericDeployRequestDto({}, context)
            .populate(event.body)
            .validateOrThrow(ModelValidationException, ValidatorErrorCode),
        );
      case DeployEventType.BE_DESTROY_INSTANCE:
        return backendController.destroyInstance(
          await new GenericDeployRequestDto({}, context)
            .populate(event.body)
            .validateOrThrow(ModelValidationException, ValidatorErrorCode),
        );
      case DeployEventType.BE_RESIZE_INSTANCE:
        return backendController.resizeInstance(
          await new ResizeInstanceDto({}, context)
            .populate(event.body)
            .validateOrThrow(ModelValidationException, ValidatorErrorCode),
        );
      default:
        throw new Error('Invalid Deploy Event Type');
    }
  }
}

// async function getDto<T extends ModelBase>(
//   dtoClass: new (data: unknown, context: ServiceContext) => T,
//   context: ServiceContext,
//   body: ModelBaseType<T>,
// ): Promise<T> {
//   const instance = new dtoClass({}, context).populate(body);
//   await instance.validateOrThrow(ModelValidationException, ValidatorErrorCode);
//   return instance;
// }
