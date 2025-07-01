import { VMStatus } from '../types';
import { ResourceStatus } from '@apillon/lib';
import { DeployCodeException } from '../../../lib/exceptions';
import { DeployErrorCode } from '../../../config/types';

export function getBackendStatus(externalStatus: VMStatus): ResourceStatus {
  switch (externalStatus) {
    case VMStatus.CREATING:
      return ResourceStatus.REQUESTED;
    case VMStatus.STARTING:
      return ResourceStatus.DEPLOYING;
    case VMStatus.RUNNING:
      return ResourceStatus.ONLINE;
    case VMStatus.RESTARTING:
      return ResourceStatus.RESTARTING;
    case VMStatus.STOPPING:
      return ResourceStatus.STOPPING;
    case VMStatus.SHUTTING_DOWN:
      return ResourceStatus.SHUTTING_DOWN;
    case VMStatus.STOPPED:
      return ResourceStatus.STOPPED;
    case VMStatus.OFFLINE:
      return ResourceStatus.ERROR;
    case VMStatus.EXITED:
      return ResourceStatus.ERROR;
    default: {
      throw new DeployCodeException({
        status: 500,
        code: DeployErrorCode.UNKNOWN_EXTERNAL_STATUS,
        errorMessage: `Unsupported external status: ${externalStatus}`,
      });
    }
  }
}
