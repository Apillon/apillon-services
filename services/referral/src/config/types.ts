export enum DbTables {
  REFERRAL = 'referral',
  REFERRAL_REFERRED = 'referral_referred',
  REFERRAL_TASK = 'referral_task',
  REFERRAL_REFERRAL_TASK = 'referral_referral_task',
  REFERRAL_REWARD = 'referral_reward',
  REFERRAL_REFERRAL_REWARD = 'referral_referral_reward',
  REFERRAL_TRANSACTION = 'referral_transaction',
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
