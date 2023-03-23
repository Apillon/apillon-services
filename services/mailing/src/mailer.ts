import {
  SMTPsendTemplate,
  SMTPsendDefaultTemplate,
} from './mailing/smtp-mailer';

/**
 * Mailer class for sending default and custom emails using SMTP.
 */
export class Mailer {
  /**
   * Send an email using the default template.
   * @param {any} event - The email data containing recipients, template, and template data.
   * @param {any} context - The service context for database access.
   * @returns {Promise<any>} - The result of the email sending operation.
   */
  static async sendDefaultMail(event, context) {
    //TODO handle attachments

    return await SMTPsendDefaultTemplate(
      context,
      event.emails,
      event.template,
      event.data,
    );
  }
  /**
   * Send an email using a custom template.
   * @param {any} event - The email data containing recipients, subject, template, and template data.
   * @param {any} context - The service context for database access.
   * @returns {Promise<any>} - The result of the email sending operation.
   */
  static async sendCustomMail(event, context) {
    //TODO handle attachments

    return await SMTPsendTemplate(
      context,
      event.emails,
      event.subject,
      event.template,
      event.data,
    );
  }
}
