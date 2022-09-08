export enum AmsEventType {
  USER_AUTH = 'user-auth',
  USER_LOGIN = 'user-login',
}

export enum LmasEventType {
  WRITE_LOG = 'write-log',
  SEND_ALERT = 'send-alert',
  NOTIFY = 'notify',
}

export enum AppEnvironment {
  LOCAL_DEV = 'local',
  TEST = 'test',
  DEV = 'development',
  STG = 'staging',
  PROD = 'production',
}
