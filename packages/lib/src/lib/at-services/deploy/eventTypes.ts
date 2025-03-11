import { DeployEventType } from '../../../config/types';
import { DeployInstanceDto } from './dtos/deploy-instance.dto';
import { GenericDeployRequestDto } from './dtos/generic-deploy-request.dto';
import { ResizeInstanceDto } from './dtos/resize-instance.dto';
import { BackendsQueryFilter } from './dtos/backends-query-filter.dto';

export type DeployMSEventType =
  | IBodyEvent<DeployEventType.BE_DEPLOY_DOCKER_COMPOSE, DeployInstanceDto>
  | IBodyEvent<DeployEventType.BE_LIST_BACKENDS, BackendsQueryFilter>
  | IBodyEvent<DeployEventType.BE_GET_INSTANCE, GenericDeployRequestDto>
  | IBodyEvent<DeployEventType.BE_GET_INSTANCE_DETAILS, GenericDeployRequestDto>
  | IBodyEvent<DeployEventType.BE_START_INSTANCE, GenericDeployRequestDto>
  | IBodyEvent<DeployEventType.BE_SHUTDOWN_INSTANCE, GenericDeployRequestDto>
  | IBodyEvent<DeployEventType.BE_STOP_INSTANCE, GenericDeployRequestDto>
  | IBodyEvent<DeployEventType.BE_RESTART_INSTANCE, GenericDeployRequestDto>
  | IBodyEvent<DeployEventType.BE_DESTROY_INSTANCE, GenericDeployRequestDto>
  | IBodyEvent<DeployEventType.BE_RESIZE_INSTANCE, ResizeInstanceDto>
  | IBodyEvent<DeployEventType.BE_GET_INSTANCE_STATE, GenericDeployRequestDto>
  | IBodyEvent<
      DeployEventType.BE_GET_INSTANCE_ATTESTATION,
      GenericDeployRequestDto
    >;
// | IBodyEvent<
//     DeployEventType.BE_GET_INSTANCE_BILLING,
//     GenericDeployRequestDto
//   >

interface IDeployMSEventBase {
  eventName: DeployEventType;
}

interface IBodyEvent<T extends DeployEventType, U> extends IDeployMSEventBase {
  eventName: T;
  body: U;
}

// interface IQueryEvent<T extends DeployEventType, U>
//   extends IBodyEvent<
//     T,
//     {
//       query: U;
//     }
//   > {
//   eventName: T;
// }

// interface IDeployUuidEvent<T extends DeployEventType>
//   extends IBodyEvent<
//     T,
//     {
//       deploy_uuid: string;
//     }
//   > {}

// interface IProjectUuidEvent<T extends DeployEventType>
//   extends IBodyEvent<T, { project_uuid: string }> {
//   eventName: T;
// }
