export enum DbTables {
  SPACE = 'space',
  POST = 'post',
}

export enum SocialErrorCode {
  //400
  DEFAULT_BAD_REQUEST_ERROR = 40019000,
  //404
  //405
  METHOD_NOT_ALLOWED = 40519001,

  //422

  //500
  GENERAL_SERVER_ERROR = 50019000,
}

export enum Chains {
  SOCIAL = 1,
  X_SOCIAL = 2,
}

export enum TransactionType {
  SPACE = 1,
  POST = 2,
}
