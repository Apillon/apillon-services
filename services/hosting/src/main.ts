import {
  BackendsQueryFilter,
  env,
  HostingEventType,
  HostingMSEventType,
  Lmas,
  ResizeInstanceDto,
} from '@apillon/lib';
import { BackendStrategyHandler } from './modules/hosting/backendStrategy.handler';
import { ServiceContext } from '@apillon/service-lib';
import { PhalaDockerHostingStrategy } from './modules/hosting/services/phala-docker-hosting.strategy';
import { PhalaDockerClient } from './modules/hosting/clients/phala-tee.client';
import { HostingRepository } from './modules/hosting/repositores/hosting-repository';
import { BackendController } from './modules/hosting/hosting.controller';

/**
 * Processing lambda event with appropriate service function based on event name
 * @param event lambda event
 * @param context lambda context
 * @returns service response
 */
export async function processEvent(
  event: HostingMSEventType,
  context: ServiceContext,
): Promise<any> {
  // TODO: separate controller for FE
  // const isBe =
  //   event.eventName &&
  //   event.eventName.length >= 2 &&
  //   event.eventName.slice(0, 2) === 'be';
  const phalaDockerHostingStrategy = new PhalaDockerHostingStrategy(
    new PhalaDockerClient(
      'https://cloud-api.phala.network/api/v1',
      env.HOSTING_PHALA_CLOUD_API_KEY,
    ),
  );
  const backendController = new BackendController(
    new HostingRepository(context),
    new BackendStrategyHandler(context, phalaDockerHostingStrategy, new Lmas()),
  );
  switch (event.eventName) {
    case HostingEventType.BE_LIST_BACKENDS:
      return backendController.listBackends(
        new BackendsQueryFilter(event.body),
      );
    case HostingEventType.BE_DEPLOY_DOCKER_COMPOSE:
      return backendController.deployDockerCompose(event.body);
    case HostingEventType.BE_GET_INSTANCE:
      return backendController.getInstance(event.body);
    case HostingEventType.BE_GET_INSTANCE_DETAILS:
      return backendController.getInstanceDetails(event.body);
    case HostingEventType.BE_GET_INSTANCE_STATE:
      return backendController.getInstanceStats(event.body);
    case HostingEventType.BE_GET_INSTANCE_ATTESTATION:
      return backendController.getInstanceAttestation(event.body);
    // case HostingEventType.BE_GET_INSTANCE_BILLING:
    //   return backendController.getInstanceBilling(event.body);
    case HostingEventType.BE_START_INSTANCE:
      return backendController.startInstance(event.body);
    case HostingEventType.BE_SHUTDOWN_INSTANCE:
      return backendController.shutdownInstance(event.body);
    case HostingEventType.BE_STOP_INSTANCE:
      return backendController.stopInstance(event.body);
    case HostingEventType.BE_RESTART_INSTANCE:
      return backendController.restartInstance(event.body);
    case HostingEventType.BE_DESTROY_INSTANCE:
      return backendController.destroyInstance(event.body);
    case HostingEventType.BE_RESIZE_INSTANCE:
      return backendController.resizeInstance(
        new ResizeInstanceDto(event.body),
      );
    default:
      throw new Error('Invalid Hosting Event Type');
  }
}
