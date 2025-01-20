export enum MailErrorCode {
  // 404 - Not found
  TEMPLATE_NOT_FOUND = 40408000,
  NOTIFICATION_NOT_FOUND = 40408001,

  // 500 - Internal Error
  ERROR_SENDING_EMAIL = 50008001,
  GENERATE_PDF_ERROR = 50008002,
}

export enum DbTables {
  NOTIFICATION = 'notification',
}
