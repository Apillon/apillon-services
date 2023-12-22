import { SqlModelStatus } from '@apillon/lib';

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
  SPACE_REQUIRED_DATA_NOT_PRESENT = 42219001,

  //500
  GENERAL_SERVER_ERROR = 50019000,
  CANNOT_INITIALIZE_SUBSTRATE_API_FOR_CHAIN = 50019001,
}

export enum Chains {
  SOCIAL = 1,
  X_SOCIAL = 2,
}

export enum TransactionType {
  SPACE = 1,
  POST = 2,
}

export enum SpaceStatus {
  FAILED = 100,
}
