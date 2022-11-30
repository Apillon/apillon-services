import {
  SMTPsendTemplate,
  SMTPsendDefaultTemplate,
} from './mailing/smtp-mailer';

export class Mailer {
  static async sendDefaultMail(event, context) {
    //TODO handle attachments

    return await SMTPsendDefaultTemplate(
      context,
      event.emails,
      event.template,
      event.data,
    );
  }

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
