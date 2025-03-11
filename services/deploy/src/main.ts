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
  // TODO: separate controller for FE
  // const isBe =
  //   event.eventName &&
  //   event.eventName.length >= 2 &&
  //   event.eventName.slice(0, 2) === 'be';
  const phalaDockerDeployStrategy = new PhalaDockerDeployStrategy(
    new PhalaDockerClient(
      'https://cloud-api.phala.network/api/v1',
      env.DEPLOY_PHALA_CLOUD_API_KEY,
    ),
  );
  const backendController = new BackendController(
    new DeployRepository(context),
    new BackendStrategyHandler(context, phalaDockerDeployStrategy, new Lmas()),
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
