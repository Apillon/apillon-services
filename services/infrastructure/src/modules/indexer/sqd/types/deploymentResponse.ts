export enum DeploymentResponseType {
  DEPLOY = 'DEPLOY',
  DEPLOY_HARD_RESET = 'DEPLOY_HARD_RESET',
  RESTART = 'RESTART',
  HIBERNATE = 'HIBERNATE',
  DELETE = 'DELETE',
  SCALE = 'SCALE',
  SET_TAG = 'SET_TAG',
  REMOVE_TAG = 'REMOVE_TAG',
}

export enum DeploymentResponseStatus {
  UNPACKING = 'UNPACKING',
  IMAGE_BUILDING = 'IMAGE_BUILDING',
  RESETTING = 'RESETTING',
  ADDING_INGRESS = 'ADDING_INGRESS',
  REMOVING_INGRESS = 'REMOVING_INGRESS',
  SQUID_SYNCING = 'SQUID_SYNCING',
  SQUID_DELETING = 'SQUID_DELETING',
  ADDONS_SYNCING = 'ADDONS_SYNCING',
  ADDONS_DELETING = 'ADDONS_DELETING',
  OK = 'OK',
  DEPLOYING = 'DEPLOYING',
}

export enum DeploymentResponseFailed {
  NO = 'NO',
  UNEXPECTED = 'UNEXPECTED',
  PERMISSIONS = 'PERMISSIONS',
  REQUIREMENTS = 'REQUIREMENTS',
  REQUIRED_SOURCE_FILE_MISSED = 'REQUIRED_SOURCE_FILE_MISSED',
  REQUIRED_SOURCE_FILE_INVALID = 'REQUIRED_SOURCE_FILE_INVALID',
  SOURCE_FILES_BUILD_FAILED = 'SOURCE_FILES_BUILD_FAILED',
}

export interface DeploymentResponse {
  id: number;
  /** @enum {string} */
  type: DeploymentResponseType;
  /** @enum {string} */
  status: DeploymentResponseStatus;
  /** @enum {string} */
  failed: DeploymentResponseFailed;
  logs: {
    severity: string;
    message: string;
  };
  squid: {
    /** @example 1 */
    id: number;
    /** @example my-squid */
    name: string;
    /** @example abc12 */
    slot: string;
    /** @example my-squid:abc12 */
    reference: string;
  };
}
