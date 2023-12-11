import { ServiceContext } from '@apillon/service-lib';
import {
  SMTPsendTemplate,
  SMTPsendDefaultTemplate,
} from './mailing/smtp-mailer';
import { env, AppEnvironment, writeLog, LogType } from '@apillon/lib';
import axios from 'axios';

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

  /**
   * Set a custom field value to a mailerlite subscriber by email
   * @param {{ field: string; value: any }}
   */
  static async setMailerliteField(
    { field, value }: { field: string; value: any },
    context: ServiceContext,
  ) {
    if (env.APP_ENV !== AppEnvironment.PROD) {
      return;
    }
    const email = context.user.email;
    try {
      await axios.put(
        `https://api.mailerlite.com/api/v2/subscribers/${email}`,
        { fields: { [field]: value } },
        { headers: { 'X-MailerLite-ApiKey': env.MAILERLITE_API_KEY } },
      );
      writeLog(
        LogType.INFO,
        `mailerlite field ${field} set for email ${email}`,
      );
    } catch (err) {
      writeLog(
        LogType.ERROR,
        `Error setting ${field} mailerlite field for ${email}: ${err.message}`,
      );
    }
  }
}
