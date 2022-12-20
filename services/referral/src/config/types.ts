export enum DbTables {
  PLAYER = 'player',
  TASK = 'task',
  REALIZATION = 'realization',
  PRODUCT = 'product',
  ORDER = 'order',
  TRANSACTION = 'transaction',
}

export enum ReferralErrorCode {
  //400
  DEFAULT_BAD_REQUEST_EROR = 40006000,
  //422
  DEFAULT_VALIDATION_ERROR = 42206000,
  //404
  DEFAULT_RESOURCE_NOT_FOUND_ERROR = 40406000,
  //409
  //500
}
