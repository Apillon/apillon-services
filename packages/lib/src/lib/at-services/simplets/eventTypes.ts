import { SimpletsEventType } from '../../../config/types';
import { SimpletDeployDto } from './dtos/simplet-deploy.dto';
import {
  DeployedSimpletsQueryFilterDto,
  SimpletsQueryFilterDto,
} from './dtos/simplets-query-filter.dto';
import { ModelBaseType } from '../../base-models/base';
import { SimpletRedeployDto } from './dtos/simplet-redeploy.dto';

export type SimpletsMSEventType =
  | IBodyEvent<SimpletsEventType.SIMPLETS_LIST, SimpletsQueryFilterDto>
  | IBodyEvent<
      SimpletsEventType.SIMPLETS_DEPLOY,
      ModelBaseType<SimpletDeployDto>
    >
  | IBodyEvent<
      SimpletsEventType.SIMPLETS_REDEPLOY,
      ModelBaseType<SimpletRedeployDto>
    >
  | ISimpletsUuidEvent<SimpletsEventType.GET_SIMPLET>
  // deployed
  | IBodyEvent<
      SimpletsEventType.LIST_DEPLOYED_SIMPLETS,
      DeployedSimpletsQueryFilterDto
    >
  | ISimpletsUuidEvent<SimpletsEventType.GET_DEPLOYED_SIMPLET>
  | ISimpletsUuidEvent<SimpletsEventType.ARCHIVE_SIMPLET_DEPLOY>
  | ISimpletsUuidEvent<SimpletsEventType.ACTIVATE_SIMPLET_DEPLOY>
  | ISimpletsUuidEvent<SimpletsEventType.IS_SIMPLET_QUOTA_REACHED>;

interface ISimpletsMSEventBase {
  eventName: SimpletsEventType;
}

interface IBodyEvent<T extends SimpletsEventType, U>
  extends ISimpletsMSEventBase {
  eventName: T;
  body: U;
}

// interface IQueryEvent<T extends SimpletsEventType, U>
//   extends IBodyEvent<
//     T,
//     {
//       query: U;
//     }
//   > {
//   eventName: T;
// }

interface ISimpletsUuidEvent<T extends SimpletsEventType>
  extends IBodyEvent<
    T,
    {
      uuid: string;
    }
  > {}

// interface IProjectUuidEvent<T extends SimpletsEventType>
//   extends IBodyEvent<T, { project_uuid: string }> {
//   eventName: T;
// }
