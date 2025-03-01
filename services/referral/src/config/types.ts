export enum DbTables {
  PLAYER = 'player',
  TASK = 'task',
  REALIZATION = 'realization',
  PRODUCT = 'product',
  ORDER = 'order',
  TRANSACTION = 'transaction',
  ATTRIBUTE = 'attribute',
  OAUTH_TOKEN_PAIR = 'oauth_token_pair',
  BALANCE = 'balance',
  PROMO_CODE = 'promo_code',
  PROMO_CODE_USER = 'promo_code_user',
  USER_AIRDROP_TASK = 'user_airdrop_task',
  TOKEN_CLAIM = 'token_claim',
  GALXE_WALLET = 'galxe_wallet',
}

export enum ReferralErrorCode {
  //400
  DEFAULT_BAD_REQUEST_EROR = 40011000,
  PLAYER_DOES_NOT_EXISTS = 40011001,
  TASK_DOES_NOT_EXISTS = 40011002,
  TASK_ALREADY_COMPLETED = 40011003,
  INVALID_TWEET = 40011004,
  PRODUCT_OUT_OF_STOCK = 40011005,
  MAX_ORDER_REACHED = 40011006,
  INSUFFICIENT_BALANCE = 40011007,
  TRANSACTION_FAILED = 40011008,
  OAUTH_APP_DENIED_OR_SESSION_EXPIRED = 40011009,
  OAUTH_INVALID_VERIFIER_OR_ACCESS_TOKENS = 40011010,
  OAUTH_SECRET_MISSING = 40011011,
  OAUTH_PROFILE_CREDENTIALS_INVALID = 40011012,
  OAUTH_USER_ID_ALREADY_PRESENT = 40011013,
  REVIEW_ALREADY_SUBMITTED = 40011014,
  CLAIM_ALREADY_COMPLETED = 40011015,
  //422
  DEFAULT_VALIDATION_ERROR = 42211000,
  MISSING_TERMS_ACCEPTANCE = 42211001,
  USER_UUID_NOT_PRESENT = 42211002,
  USER_EMAIL_NOT_PRESENT = 42211003,
  REFERRAL_CODE_NOT_PRESENT = 42211004,
  TASK_ID_NOT_PRESENT = 42211005,
  PLAYER_ID_NOT_PRESENT = 42211006,
  REWARD_NOT_PRESENT = 42211007,
  TASK_TYPE_NOT_PRESENT = 42211008,
  PRODUCT_ID_NOT_PRESENT = 42211009,

  PROMO_CODE_NOT_PRESENT = 42211010,
  PROMO_CODE_CREDIT_AMOUNT_NOT_PRESENT = 42211011,
  //403
  CLAIM_FORBIDDEN = 40311000,
  USER_NOT_ELIGIBLE = 40311001,
  //404
  DEFAULT_RESOURCE_NOT_FOUND_ERROR = 40411000,
  //409
  //500
  ERROR_LINKING_GITHUB = 50011001,
  ERROR_LINKING_TWITTER = 50011002,
  ERROR_REVIEWING_TASKS = 50011003,
}

export enum TransactionDirection {
  DEPOSIT = 1,
  WITHDRAW = 2,
}
