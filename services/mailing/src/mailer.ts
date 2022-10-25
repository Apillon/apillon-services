import { SMTPsendTemplate } from './mailing/smtp-mailer';

export class Mailer {
  static async sendMail(event, context) {
    //TODO handle attachments

    return await SMTPsendTemplate(
      event.emails,
      event.subject,
      event.template,
      event.data,
    );
  }
}
