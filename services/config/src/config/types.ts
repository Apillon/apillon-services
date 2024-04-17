export enum DbTables {
  QUOTA = 'quota',
  OVERRIDE = 'override',
  CREDIT = 'credit',
  CREDIT_TRANSACTION = 'creditTransaction',
  CREDIT_PACKAGE = 'creditPackage',
  PRODUCT = 'product',
  PRODUCT_PRICE = 'productPrice',
  SUBSCRIPTION = 'subscription',
  SUBSCRIPTION_PACKAGE = 'subscriptionPackage',
  INVOICE = 'invoice',
}

/**
 * Error codes
 * code format : HTTPCODE|MODULE_CODE|MODULE_INTERNAL_ERROR_CODE
 *
 **/

export enum ConfigErrorCode {
  // 422 - Unprocessable entry
  STATUS_NOT_PRESENT = 42210000,
  INVALID_STATUS = 42210001,
  PROJECT_OR_OBJECT_UUID_NOT_PRESENT = 42210002,
  INVALID_QUOTA_TYPE = 42210003,
  CREDIT_QUOTA_UUID_NOT_PRESENT = 42210004,
  CREDIT_TRANSACTION_REQUIRED_DATA_NOT_PRESENT = 42210005,
  PRODUCT_REQUIRED_DATA_NOT_PRESENT = 42210006,
  PRODUCT_PRICE_REQUIRED_DATA_NOT_PRESENT = 42210007,
  SUBSCRIPTION_PACKAGE_ID_NOT_PRESENT = 42210008,
  SUBSCRIPTION_PACKAGE_ID_NOT_VALID = 42210009,
  STRIPE_ID_NOT_VALID = 42210010,
  PROJECT_UUID_NOT_PRESENT = 42210011,
  EXPIRATION_DATE_NOT_PRESENT = 42210012,
  CLIENT_EMAIL_NOT_PRESENT = 42210013,
  CLIENT_NAME_NOT_PRESENT = 42210014,
  TOTAL_AMOUNT_NOT_PRESENT = 42210015,
  SUBTOTAL_AMOUNT_NOT_PRESENT = 42210016,
  INVALID_CREDIT_DIRECTION = 42210017,
  INVALID_QUOTA_WARNING_LEVEL = 42210018,
  INVOICE_UUID_NOT_PRESENT = 42210019,

  // 400 - Bad request
  BAD_REQUEST = 40010001,
  ACTIVE_SUBSCRIPTION_EXISTS = 40010002,

  // 401 - Unauthorized (Not authenticated)
  USER_IS_NOT_AUTHENTICATED = 40110100,

  // 402 - Payment required
  CREDIT_BALANCE_TOO_LOW = 40210000,

  // 403 - Forbidden
  USER_IS_NOT_AUTHORIZED = 40310100,
  INVALID_API_KEY = 40310001,

  // 404 - Not found
  API_KEY_NOT_FOUND = 40410001,
  QUOTA_NOT_FOUND = 404010002,
  OVERRIDE_NOT_FOUND = 404010003,
  SUBSCRIPTION_PACKAGE_NOT_FOUND = 404010004,
  CREDIT_PACKAGE_NOT_FOUND = 404010005,
  SUBSCRIPTION_NOT_FOUND = 404010006,
  PROJECT_CREDIT_NOT_FOUND = 404010007,

  // 500 - Internal Error
  ERROR_WRITING_TO_DATABASE = 50010001,
  ERROR_READING_FROM_DATABASE = 50010002,
  ERROR_ADDING_CREDIT = 50010003,
  ERROR_SPENDING_CREDIT = 50010004,
  PRODUCT_DOES_NOT_EXISTS = 50010005,
  PRODUCT_PRICE_DOES_NOT_EXISTS = 50010006,
  CREDIT_TRANSACTION_FOR_REFUND_NOT_EXISTS_OR_REFUNDED = 50010007,
  ERROR_REFUNDING_CREDIT_TRANSACTION = 50010008,
  ERROR_CREATING_SUBSCRIPTION = 50010009,
  ERROR_UPDATING_SUBSCRIPTION = 500100010,
  ERROR_HANDLING_STRIPE_WEBHOOK = 50010011,
  SUBSCRIPTION_QUOTA_WORKER_UNHANDLED_EXCEPTION = 50010012,
}

export enum CreditDirection {
  RECEIVE = 1,
  SPEND = 2,
}

/**
 * If a project exceeds a quota after a subscription has expired
 * define levels at which warnings are sent to the user via email
 */
export enum QuotaWarningLevel {
  THREE_DAYS = 3,
  FIFTEEN_DAYS = 15,
  THIRTY_DAYS = 30,
  RESOURCES_RELEASED = 100, // Resources forcefully released due to no response
}
