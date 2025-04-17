import { ServiceContext } from '@apillon/service-lib';
import {
  SMTPsendTemplate,
  SMTPsendDefaultTemplate,
} from './mailing/smtp-mailer';
import {
  env,
  AppEnvironment,
  writeLog,
  LogType,
  Lmas,
  ServiceName,
  getEnvSecrets,
  EmailDataDto,
} from '@apillon/lib';
import axios from 'axios';

/**
 * Mailer class for sending default and custom emails using SMTP.
 */
export class Mailer {
  /**
   * Send an email using the default template.
   * @param {{ emailData: EmailDataDto }} event - The email data containing recipients, template, and template data.
   * @param {ServiceContext} context - The service context for database access.
   * @returns {Promise<any>} - The result of the email sending operation.
   */
  static async sendDefaultMail(
    event: { emailData: EmailDataDto },
    context: ServiceContext,
  ): Promise<any> {
    return await SMTPsendDefaultTemplate(
      context,
      new EmailDataDto(event.emailData),
    );
  }

  /**
   * Send an email using a custom template.
   * @param {{ emailData: EmailDataDto }} event - The email data containing recipients, subject, template, and template data.
   * @param {ServiceContext} context - The service context for database access.
   * @returns {Promise<any>} - The result of the email sending operation.
   */
  static async sendCustomMail(
    event: { emailData: EmailDataDto },
    context: ServiceContext,
  ): Promise<any> {
    return await SMTPsendTemplate(context, new EmailDataDto(event.emailData));
  }

  /**
   * Set a custom field value to a mailerlite subscriber by email
   * @param {{ field: string; value: any }}
   */
  static async setMailerliteField(
    { field, value, email }: { field: string; value: any; email: string },
    context: ServiceContext,
  ) {
    await getEnvSecrets();
    if (env.APP_ENV !== AppEnvironment.PROD) {
      return;
    }
    email ||= context.user?.email;

    if (!email) {
      writeLog(LogType.WARN, 'setMailerliteField: No email found in context');
      return;
    }

    try {
      await axios.put(
        `https://api.mailerlite.com/api/v2/subscribers/${email}`,
        { fields: { [field]: value } },
        { headers: { 'X-MailerLite-ApiKey': env.MAILERLITE_API_KEY } },
      );
      writeLog(
        LogType.INFO,
        `mailerlite field ${field} set to ${value} for email ${email}`,
      );
    } catch (err) {
      if (err?.response?.status === 404) {
        writeLog(
          LogType.ERROR,
          `Error setting mailerlite field ${field} with value ${value} for email ${email}: 404 Not Found`,
        );
      } else {
        await new Lmas().writeLog({
          context,
          logType: LogType.ERROR,
          message: `Error setting mailerlite field`,
          user_uuid: context.user?.user_uuid,
          location: 'Mailer/setMailerliteField',
          service: ServiceName.MAIL,
          data: { email, field, value, err },
          sendAdminAlert: true,
        });
      }
    }
  }
}
