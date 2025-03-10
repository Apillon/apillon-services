import { HostingEventType } from '../../../config/types';
import { DeployInstanceDto } from './dtos/deploy-instance.dto';
import { GenericHostingRequestDto } from './dtos/generic-hosting-request.dto';
import { ResizeInstanceDto } from './dtos/resize-instance.dto';
import { BackendsQueryFilter } from './dtos/backends-query-filter.dto';

export type HostingMSEventType =
  | IBodyEvent<HostingEventType.BE_DEPLOY_DOCKER_COMPOSE, DeployInstanceDto>
  | IBodyEvent<HostingEventType.BE_LIST_BACKENDS, BackendsQueryFilter>
  | IBodyEvent<HostingEventType.BE_GET_INSTANCE, GenericHostingRequestDto>
  | IBodyEvent<
      HostingEventType.BE_GET_INSTANCE_DETAILS,
      GenericHostingRequestDto
    >
  | IBodyEvent<HostingEventType.BE_START_INSTANCE, GenericHostingRequestDto>
  | IBodyEvent<HostingEventType.BE_SHUTDOWN_INSTANCE, GenericHostingRequestDto>
  | IBodyEvent<HostingEventType.BE_STOP_INSTANCE, GenericHostingRequestDto>
  | IBodyEvent<HostingEventType.BE_RESTART_INSTANCE, GenericHostingRequestDto>
  | IBodyEvent<HostingEventType.BE_DESTROY_INSTANCE, GenericHostingRequestDto>
  | IBodyEvent<HostingEventType.BE_RESIZE_INSTANCE, ResizeInstanceDto>
  | IBodyEvent<HostingEventType.BE_GET_INSTANCE_STATE, GenericHostingRequestDto>
  | IBodyEvent<
      HostingEventType.BE_GET_INSTANCE_ATTESTATION,
      GenericHostingRequestDto
    >;
// | IBodyEvent<
//     HostingEventType.BE_GET_INSTANCE_BILLING,
//     GenericHostingRequestDto
//   >

interface IHostingMSEventBase {
  eventName: HostingEventType;
}

interface IBodyEvent<T extends HostingEventType, U>
  extends IHostingMSEventBase {
  eventName: T;
  body: U;
}

// interface IQueryEvent<T extends HostingEventType, U>
//   extends IBodyEvent<
//     T,
//     {
//       query: U;
//     }
//   > {
//   eventName: T;
// }

// interface IHostingUuidEvent<T extends HostingEventType>
//   extends IBodyEvent<
//     T,
//     {
//       hosting_uuid: string;
//     }
//   > {}

// interface IProjectUuidEvent<T extends HostingEventType>
//   extends IBodyEvent<T, { project_uuid: string }> {
//   eventName: T;
// }
