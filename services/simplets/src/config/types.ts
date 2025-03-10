export enum DbTables {
  SIMPLET = 'simplet',
  SIMPLET_DEPLOY = 'simplet_deploy',
}

export enum SimpletsErrorCode {
  //400
  //404
  SIMPLET_NOT_FOUND = 40421001,
  //405

  //422
  DATA_NOT_PRESENT = 42221001,
  DATA_NOT_VALID = 42221002,

  //500
  GENERAL_SERVER_ERROR = 50021000,
  CONTRACT_DEPLOYMENT_FAILED = 50021001,
  BACKEND_DEPLOYMENT_FAILED = 50021002,
  // 501
}

export enum ResourceActions {
  DEPLOY = 1,
  DEPLOY_FAILED = 2,
  SHUT_DOWN = 3,
}

export enum ResourceStatus {
  CREATED = 0,
  DEPLOYING = 1,
  DEPLOYED = 2,
  SHUT_DOWN = 3,
  FAILED = 4,
}
