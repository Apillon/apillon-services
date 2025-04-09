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
        const backendQuery = new BackendsQueryFilter(event.body);
        await backendQuery.validateOrThrow(
          ModelValidationException,
          ValidatorErrorCode,
        );
        return backendController.listBackends(backendQuery);
      case DeployEventType.BE_DEPLOY_DOCKER_COMPOSE:
        const deployInstance = new DeployInstanceDto({}, context).populate(
          event.body,
        );
        await deployInstance.validateOrThrow(
          ModelValidationException,
          ValidatorErrorCode,
        );
        return backendController.deployDockerCompose(deployInstance);
      case DeployEventType.BE_GET_INSTANCE:
        const getInstanceDto = new GenericDeployRequestDto(
          {},
          context,
        ).populate(event.body);
        await getInstanceDto.validateOrThrow(
          ModelValidationException,
          ValidatorErrorCode,
        );
        return backendController.getInstance(getInstanceDto);
      case DeployEventType.BE_GET_INSTANCE_DETAILS:
        const getInstanceDetailsDto = new GenericDeployRequestDto(
          {},
          context,
        ).populate(event.body);
        await getInstanceDetailsDto.validateOrThrow(
          ModelValidationException,
          ValidatorErrorCode,
        );
        return backendController.getInstanceDetails(getInstanceDetailsDto);
      case DeployEventType.BE_GET_INSTANCE_STATE:
        const getInstanceStateDto = new GenericDeployRequestDto(
          {},
          context,
        ).populate(event.body);
        await getInstanceStateDto.validateOrThrow(
          ModelValidationException,
          ValidatorErrorCode,
        );
        return backendController.getInstanceStats(getInstanceStateDto);
      case DeployEventType.BE_GET_INSTANCE_ATTESTATION:
        const getInstanceAttestationDto = new GenericDeployRequestDto(
          {},
          context,
        ).populate(event.body);
        await getInstanceAttestationDto.validateOrThrow(
          ModelValidationException,
          ValidatorErrorCode,
        );
        return backendController.getInstanceAttestation(
          getInstanceAttestationDto,
        );
      // case DeployEventType.BE_GET_INSTANCE_BILLING:
      //   return backendController.getInstanceBilling();
      case DeployEventType.BE_START_INSTANCE:
        const startInstanceDto = new GenericDeployRequestDto(
          {},
          context,
        ).populate(event.body);
        await startInstanceDto.validateOrThrow(
          ModelValidationException,
          ValidatorErrorCode,
        );
        return backendController.startInstance(startInstanceDto);
      case DeployEventType.BE_SHUTDOWN_INSTANCE:
        const shutdownInstanceDto = new GenericDeployRequestDto(
          {},
          context,
        ).populate(event.body);
        await shutdownInstanceDto.validateOrThrow(
          ModelValidationException,
          ValidatorErrorCode,
        );
        return backendController.shutdownInstance(shutdownInstanceDto);
      case DeployEventType.BE_STOP_INSTANCE:
        const stopInstanceDto = new GenericDeployRequestDto(
          {},
          context,
        ).populate(event.body);
        await stopInstanceDto.validateOrThrow(
          ModelValidationException,
          ValidatorErrorCode,
        );
        return backendController.stopInstance(stopInstanceDto);
      case DeployEventType.BE_RESTART_INSTANCE:
        const restartInstanceDto = new GenericDeployRequestDto(
          {},
          context,
        ).populate(event.body);
        await restartInstanceDto.validateOrThrow(
          ModelValidationException,
          ValidatorErrorCode,
        );
        return backendController.restartInstance(restartInstanceDto);
      case DeployEventType.BE_DESTROY_INSTANCE:
        const destroyInstanceDto = new GenericDeployRequestDto(
          {},
          context,
        ).populate(event.body);
        await destroyInstanceDto.validateOrThrow(
          ModelValidationException,
          ValidatorErrorCode,
        );
        return backendController.destroyInstance(destroyInstanceDto);
      case DeployEventType.BE_RESIZE_INSTANCE:
        const resizeInstanceDto = new ResizeInstanceDto({}, context).populate(
          event.body,
        );
        await resizeInstanceDto.validateOrThrow(
          ModelValidationException,
          ValidatorErrorCode,
        );
        return backendController.resizeInstance(resizeInstanceDto);
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
